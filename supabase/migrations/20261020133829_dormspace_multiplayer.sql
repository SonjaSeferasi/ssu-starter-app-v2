-- Ephemeral DormSpace players and nearby chat. Existing rooms, layouts and DMs are untouched.
-- Business logic lives in a private schema; only the verified server bridge can invoke it.
CREATE SCHEMA dormspace_live;
REVOKE ALL ON SCHEMA dormspace_live FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA dormspace_live TO service_role;

CREATE TABLE dormspace_live.players (
  student_id BIGINT PRIMARY KEY REFERENCES socialu.students(student_id),
  connection_id UUID NOT NULL,
  session_id UUID NOT NULL REFERENCES auth.sessions(id) ON DELETE CASCADE,
  space TEXT NOT NULL,
  room_owner_id BIGINT REFERENCES socialu.students(student_id),
  state JSONB NOT NULL,
  sequence BIGINT NOT NULL DEFAULT 0 CHECK(sequence >= 0),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  seen_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX dormspace_live_players_space_seen ON dormspace_live.players(space,seen_at);
CREATE INDEX dormspace_live_players_room ON dormspace_live.players(room_owner_id) WHERE room_owner_id IS NOT NULL;
CREATE INDEX dormspace_live_players_session ON dormspace_live.players(session_id);
CREATE INDEX dormspace_live_players_expiry ON dormspace_live.players(seen_at);
CREATE TABLE dormspace_live.messages (
  message_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES socialu.students(student_id),
  client_id UUID NOT NULL,
  space TEXT NOT NULL,
  text_content TEXT NOT NULL CHECK(char_length(text_content) BETWEEN 1 AND 200 AND text_content ~ '[^[:space:]]'),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(student_id,client_id)
);
CREATE INDEX dormspace_live_messages_space_sent ON dormspace_live.messages(space,sent_at DESC);
CREATE INDEX dormspace_live_messages_student_sent ON dormspace_live.messages(student_id,sent_at DESC);
CREATE INDEX dormspace_live_messages_expiry ON dormspace_live.messages(sent_at);
ALTER TABLE dormspace_live.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE dormspace_live.messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA dormspace_live FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA dormspace_live FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION dormspace_live.valid_player(p dormspace_live.players) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT p.seen_at > clock_timestamp()-interval '15 seconds'
  AND EXISTS(SELECT 1 FROM socialu.students s JOIN auth.users a ON a.id=s.auth_user_id
    JOIN auth.sessions se ON se.user_id=a.id AND se.id=p.session_id
    WHERE s.student_id=p.student_id AND s.is_active AND NOT s.reverification_required
      AND s.email_verified_at IS NOT NULL AND a.email_confirmed_at IS NOT NULL
      AND lower(a.email)=lower(s.university_email)
      AND public.socialu_session_guard('check',a.id,se.id,se.created_at))
  AND (p.room_owner_id IS NULL OR EXISTS(SELECT 1 FROM socialu.students o
    WHERE o.student_id=p.room_owner_id AND o.is_active AND NOT o.reverification_required
      AND (p.student_id=o.student_id OR socialu.are_friends(p.student_id,o.student_id))));
$$;

CREATE FUNCTION dormspace_live.player_json(p dormspace_live.players) RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('id',s.student_id::text,'connectionId',p.connection_id::text,
   'username',s.username,'space',p.space,'state',p.state,'updatedAt',p.updated_at,
   'avatar',jsonb_build_object('appearance',CASE WHEN av.student_id IS NULL THEN NULL ELSE
      jsonb_build_object('outfitId',av.outfit_id::text,'faceId',av.default_face_id::text)||av.customization END,
    'outfits',CASE WHEN c.item_id IS NULL THEN '[]'::jsonb ELSE
      jsonb_build_array(jsonb_build_object('id',c.item_id::text,'name',c.name,'assetKey',c.preview_key)) END,
    'faces',CASE WHEN f.face_id IS NULL THEN '[]'::jsonb ELSE
      jsonb_build_array(jsonb_build_object('id',f.face_id::text,'assetKey',f.asset_key,'initial',f.is_initial)) END,
    'activities','[]'::jsonb))
 FROM socialu.students s LEFT JOIN socialu.student_avatars av ON av.student_id=s.student_id
 LEFT JOIN socialu.catalog_items c ON c.item_id=av.outfit_id
 LEFT JOIN socialu.default_faces f ON f.face_id=av.default_face_id WHERE s.student_id=p.student_id;
$$;

CREATE FUNCTION dormspace_live.fanout(p_space TEXT,p_sender BIGINT,p_event JSONB) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE recipient RECORD;
BEGIN
 FOR recipient IN SELECT DISTINCT s.auth_user_id FROM dormspace_live.players p
   JOIN socialu.students s ON s.student_id=p.student_id
   WHERE p.space=p_space AND p.student_id<>p_sender AND dormspace_live.valid_player(p)
     AND NOT socialu.is_blocked(p.student_id,p_sender)
 LOOP
   PERFORM realtime.send(p_event||jsonb_build_object('space',p_space),
     'dormspace_event','dormspace:'||recipient.auth_user_id::text,true);
 END LOOP;
END;
$$;

CREATE FUNCTION dormspace_live.snapshot(p dormspace_live.players) RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('self',dormspace_live.player_json(p),'space',p.space,'serverTime',clock_timestamp(),
  'players',coalesce((SELECT jsonb_agg(dormspace_live.player_json(other) ORDER BY other.student_id)
    FROM dormspace_live.players other WHERE other.space=p.space AND dormspace_live.valid_player(other)
    AND NOT socialu.is_blocked(p.student_id,other.student_id)),'[]'::jsonb),
  'messages',coalesce((SELECT jsonb_agg(m.message ORDER BY m.sent_at,m.message_id) FROM (
    SELECT msg.message_id,msg.sent_at,jsonb_build_object('id',msg.message_id::text,'playerId',s.student_id::text,
      'username',s.username,'text',msg.text_content,'sentAt',msg.sent_at,'space',msg.space) AS message
    FROM dormspace_live.messages msg JOIN socialu.students s ON s.student_id=msg.student_id
    WHERE msg.space=p.space AND msg.sent_at>=p.joined_at AND s.is_active
      AND NOT socialu.is_blocked(p.student_id,msg.student_id)
    ORDER BY msg.sent_at DESC,msg.message_id DESC LIMIT 40) m),'[]'::jsonb),
  'room',CASE WHEN p.room_owner_id IS NULL THEN NULL ELSE (
    SELECT jsonb_build_object('version',d.save_version,'wallItemId',d.wall_item_id::text,'floorItemId',d.floor_item_id::text,
      'placements',coalesce((SELECT jsonb_agg(jsonb_build_object('itemId',dp.item_id::text,'x',dp.x,'y',dp.y,'rotation',dp.rotation)
       ORDER BY dp.item_id) FROM socialu.dorm_placements dp WHERE dp.owner_id=d.owner_id),'[]'::jsonb))
    FROM socialu.dorms d WHERE d.owner_id=p.room_owner_id) END);
$$;

CREATE FUNCTION dormspace_live.operate(p_auth_id UUID,p_session UUID,p_connection UUID,p_action TEXT,
 p_location JSONB DEFAULT '{}'::jsonb,p_data JSONB DEFAULT '{}'::jsonb) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE me BIGINT; member dormspace_live.players%ROWTYPE; old_member dormspace_live.players%ROWTYPE;
 v_owner BIGINT; space_id TEXT; next_state JSONB; v_x NUMERIC; v_y NUMERIC; w INTEGER; h INTEGER;
 seat BIGINT; seat_key TEXT; seq BIGINT; msg dormspace_live.messages%ROWTYPE; message JSONB; text_value TEXT; state_changed BOOLEAN; new_message BOOLEAN:=false;
BEGIN
 me:=public.socialu_require_student(p_auth_id);
 IF NOT EXISTS(SELECT 1 FROM auth.sessions s WHERE s.id=p_session AND s.user_id=p_auth_id
   AND public.socialu_session_guard('check',p_auth_id,p_session,s.created_at)) THEN
   RAISE EXCEPTION 'Your sign-in has ended. Please sign in again.' USING ERRCODE='42501';
 END IF;
 IF p_connection IS NULL OR p_action NOT IN ('join','update','sync','say','leave') THEN
   RAISE EXCEPTION 'Choose a valid multiplayer action.' USING ERRCODE='22023';
 END IF;
 -- Expired rows and old nearby chat are ephemeral, not permanent conversation history.
 DELETE FROM dormspace_live.players WHERE seen_at<clock_timestamp()-interval '15 seconds';
 DELETE FROM dormspace_live.messages WHERE sent_at<clock_timestamp()-interval '10 minutes';

 IF p_action='leave' THEN
   DELETE FROM dormspace_live.players WHERE student_id=me AND connection_id=p_connection AND session_id=p_session RETURNING * INTO member;
   IF FOUND THEN PERFORM dormspace_live.fanout(member.space,me,jsonb_build_object('type','leave','id',me::text,
     'connectionId',p_connection::text,'updatedAt',clock_timestamp())); END IF;
   RETURN jsonb_build_object('left',true);
 END IF;

 IF p_action='join' THEN
   IF p_location->>'kind'='hall' AND p_location->>'floor' ~ '^[1-9][0-9]{0,2}$' THEN
     space_id:='hall:'||(p_location->>'floor');
   ELSIF p_location->>'kind'='room' THEN
     SELECT s.student_id INTO v_owner FROM socialu.students s JOIN socialu.dorms d ON d.owner_id=s.student_id
       WHERE s.username=p_location->>'owner' AND s.is_active AND NOT s.reverification_required
       AND (s.student_id=me OR socialu.are_friends(me,s.student_id));
     IF v_owner IS NULL THEN RAISE EXCEPTION 'You can visit only your own dorm or a current friend''s dorm.' USING ERRCODE='42501'; END IF;
     space_id:='room:'||v_owner::text;
   ELSE RAISE EXCEPTION 'Choose a valid hall floor or dorm.' USING ERRCODE='22023'; END IF;
   SELECT * INTO old_member FROM dormspace_live.players WHERE student_id=me FOR UPDATE;
   IF FOUND THEN
     PERFORM dormspace_live.fanout(old_member.space,me,jsonb_build_object('type','leave','id',me::text,
       'connectionId',old_member.connection_id::text,'updatedAt',clock_timestamp()));
   END IF;
   member.student_id:=me; member.connection_id:=p_connection; member.session_id:=p_session;
   member.space:=space_id; member.room_owner_id:=v_owner; member.joined_at:=clock_timestamp();
 ELSE
   SELECT * INTO member FROM dormspace_live.players WHERE student_id=me AND connection_id=p_connection AND session_id=p_session FOR UPDATE;
   IF NOT FOUND THEN
     IF EXISTS(SELECT 1 FROM dormspace_live.players current_player WHERE current_player.student_id=me
       AND current_player.connection_id<>p_connection AND dormspace_live.valid_player(current_player)) THEN
       RAISE EXCEPTION 'Your player is open in another tab. Reconnect to join again.' USING ERRCODE='DS409';
     ELSE RAISE EXCEPTION 'Your connection ended. Rejoining DormSpace…' USING ERRCODE='DS408'; END IF;
   END IF;
   IF NOT dormspace_live.valid_player(member) THEN
     RAISE EXCEPTION 'Your visit has ended. Return to the hall to continue.' USING ERRCODE='42501';
   END IF;
   v_owner:=member.room_owner_id; space_id:=member.space;
 END IF;

   IF p_action='update' THEN
     IF p_data->>'sequence' IS NULL OR p_data->>'sequence' !~ '^[0-9]{1,15}$' THEN RAISE EXCEPTION 'Enter a valid movement sequence.' USING ERRCODE='22023'; END IF;
     seq:=(p_data->>'sequence')::bigint;
     IF seq<=member.sequence THEN RETURN jsonb_build_object('self',dormspace_live.player_json(member),'space',space_id,'serverTime',clock_timestamp()); END IF;
   ELSE seq:=0; END IF;

 IF p_action IN ('join','update') THEN
   next_state:=p_data->'state';
   IF next_state IS NULL OR jsonb_typeof(next_state)<>'object' OR
     next_state-ARRAY['x','y','facing','moving','sprinting','restItemId']<>'{}'::jsonb OR
     jsonb_typeof(next_state->'x') IS DISTINCT FROM 'number' OR jsonb_typeof(next_state->'y') IS DISTINCT FROM 'number' OR
     jsonb_typeof(next_state->'facing') IS DISTINCT FROM 'string' OR next_state->>'facing' NOT IN ('up','down','left','right') OR
     jsonb_typeof(next_state->'moving') IS DISTINCT FROM 'boolean' OR jsonb_typeof(next_state->'sprinting') IS DISTINCT FROM 'boolean' THEN
     RAISE EXCEPTION 'Enter a valid player position.' USING ERRCODE='22023'; END IF;
   v_x:=(next_state->>'x')::numeric; v_y:=(next_state->>'y')::numeric;
   IF v_owner IS NULL THEN
     IF v_x<3 OR v_x>97 OR v_y<5 OR v_y>96 OR next_state->>'restItemId' IS NOT NULL THEN
       RAISE EXCEPTION 'Stay inside the hall.' USING ERRCODE='22023'; END IF;
   ELSE
     SELECT width_cells,height_cells INTO w,h FROM socialu.room_surfaces WHERE surface_code='floor';
     IF v_x<0 OR v_y<0 OR v_x>w-1 OR v_y>h-1 THEN RAISE EXCEPTION 'Stay on the walkable dorm floor.' USING ERRCODE='22023'; END IF;
     -- Rejoining a changed room always starts at its reserved entrance, never inside new furniture.
     IF p_action='join' THEN
       SELECT r.x,r.y INTO v_x,v_y FROM socialu.reserved_room_cells r WHERE r.surface_code='floor' ORDER BY abs(r.x-(w-1)/2.0),r.y DESC,r.x LIMIT 1;
       IF v_x IS NULL THEN v_x:=least(4,w-1);v_y:=h-1;END IF;
       next_state:=next_state||jsonb_build_object('x',v_x,'y',v_y,'restItemId',NULL,'moving',false,'sprinting',false);
     END IF;
     IF EXISTS(SELECT 1 FROM socialu.dorm_placements dp JOIN socialu.item_footprints f USING(item_id)
       WHERE dp.owner_id=v_owner AND f.surface_code='floor' AND f.overlap_category<>'rug'
       AND round(v_x)>=dp.x AND round(v_x)<dp.x+CASE WHEN dp.rotation IN (90,270) THEN f.height_cells ELSE f.width_cells END
       AND round(v_y)>=dp.y AND round(v_y)<dp.y+CASE WHEN dp.rotation IN (90,270) THEN f.width_cells ELSE f.height_cells END) THEN
       RAISE EXCEPTION 'Furniture moved into that spot. Your room is being refreshed.' USING ERRCODE='DS400'; END IF;
     IF next_state->>'restItemId' IS NOT NULL THEN
       IF next_state->>'restItemId' !~ '^[1-9][0-9]{0,17}$' THEN RAISE EXCEPTION 'Choose a placed bed or seat.' USING ERRCODE='22023'; END IF;
       seat:=(next_state->>'restItemId')::bigint;
       SELECT c.preview_key INTO seat_key FROM socialu.dorm_placements dp JOIN socialu.catalog_items c USING(item_id)
         WHERE dp.owner_id=v_owner AND dp.item_id=seat AND c.preview_key IN ('bed','chair','dorm-sofa','dorm-armchair');
       IF seat_key IS NULL THEN RAISE EXCEPTION 'That furniture is no longer available.' USING ERRCODE='DS400'; END IF;
       PERFORM pg_catalog.pg_advisory_xact_lock(351,(v_owner%2147483647)::integer);
       IF EXISTS(SELECT 1 FROM dormspace_live.players other WHERE other.space=space_id AND other.student_id<>me
         AND other.state->>'restItemId'=seat::text AND dormspace_live.valid_player(other)) THEN
         RAISE EXCEPTION 'Someone is already using that furniture.' USING ERRCODE='DS410'; END IF;
       next_state:=next_state||jsonb_build_object('moving',false,'sprinting',false);
     END IF;
   END IF;
   state_changed:=p_action='join' OR next_state IS DISTINCT FROM member.state;
   member.state:=next_state; member.sequence:=seq; member.updated_at:=clock_timestamp(); member.seen_at:=clock_timestamp();
   INSERT INTO dormspace_live.players VALUES(member.*) ON CONFLICT(student_id) DO UPDATE SET
     connection_id=EXCLUDED.connection_id,session_id=EXCLUDED.session_id,space=EXCLUDED.space,room_owner_id=EXCLUDED.room_owner_id,
     state=EXCLUDED.state,sequence=EXCLUDED.sequence,joined_at=EXCLUDED.joined_at,updated_at=EXCLUDED.updated_at,seen_at=EXCLUDED.seen_at;
   IF state_changed THEN PERFORM dormspace_live.fanout(space_id,me,jsonb_build_object('type','player','player',dormspace_live.player_json(member))); END IF;
 ELSIF p_action='sync' THEN
   UPDATE dormspace_live.players SET seen_at=clock_timestamp() WHERE student_id=me RETURNING * INTO member;
 END IF;

 IF p_action='say' THEN
   text_value:=btrim(regexp_replace(coalesce(p_data->>'text',''),'[[:space:]]+',' ','g'));
   IF char_length(text_value) NOT BETWEEN 1 AND 200 OR text_value !~ '[^[:space:]]' OR
     p_data->>'messageId' IS NULL THEN RAISE EXCEPTION 'Write a message of 1 to 200 characters.' USING ERRCODE='22023'; END IF;
   SELECT * INTO msg FROM dormspace_live.messages WHERE student_id=me AND client_id=(p_data->>'messageId')::uuid;
   IF FOUND THEN
     IF msg.space<>space_id OR msg.text_content<>text_value THEN RAISE EXCEPTION 'Start a new message.' USING ERRCODE='22023'; END IF;
   ELSE
     IF EXISTS(SELECT 1 FROM dormspace_live.messages WHERE student_id=me AND sent_at>clock_timestamp()-interval '1 second') THEN
       RAISE EXCEPTION 'Please wait a moment before sending another message.' USING ERRCODE='DS429'; END IF;
     INSERT INTO dormspace_live.messages(student_id,client_id,space,text_content)
       VALUES(me,(p_data->>'messageId')::uuid,space_id,text_value) RETURNING * INTO msg;
     new_message:=true;
   END IF;
   SELECT jsonb_build_object('id',msg.message_id::text,'playerId',me::text,'username',s.username,
     'text',msg.text_content,'sentAt',msg.sent_at,'space',space_id) INTO message FROM socialu.students s WHERE s.student_id=me;
   IF new_message THEN PERFORM dormspace_live.fanout(space_id,me,jsonb_build_object('type','message','message',message)); END IF;
   RETURN jsonb_build_object('message',message,'space',space_id,'serverTime',clock_timestamp());
 END IF;
 IF p_action IN ('join','sync') OR coalesce((p_data->>'snapshot')::boolean,false) THEN RETURN dormspace_live.snapshot(member); END IF;
 RETURN jsonb_build_object('self',dormspace_live.player_json(member),'space',space_id,'serverTime',clock_timestamp());
END;
$$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA dormspace_live FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION dormspace_live.operate(UUID,UUID,UUID,TEXT,JSONB,JSONB) TO service_role;
CREATE FUNCTION public.socialu_dormspace_live(p_auth_id UUID,p_session UUID,p_connection UUID,p_action TEXT,
 p_location JSONB DEFAULT '{}'::jsonb,p_data JSONB DEFAULT '{}'::jsonb) RETURNS JSONB
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
 SELECT dormspace_live.operate(p_auth_id,p_session,p_connection,p_action,p_location,p_data);
$$;
REVOKE ALL ON FUNCTION public.socialu_dormspace_live(UUID,UUID,UUID,TEXT,JSONB,JSONB) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_dormspace_live(UUID,UUID,UUID,TEXT,JSONB,JSONB) TO service_role;

-- Clients receive only server-authored updates addressed to their own identity. No INSERT grant.
CREATE POLICY socialu_dormspace_receive_own_channel ON realtime.messages FOR SELECT TO authenticated USING(
 extension='broadcast' AND (SELECT realtime.topic())='dormspace:'||(SELECT auth.uid())::text);
NOTIFY pgrst,'reload schema';
