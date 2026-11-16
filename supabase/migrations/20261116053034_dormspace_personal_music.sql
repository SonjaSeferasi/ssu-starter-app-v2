-- SRS-530.1-.6. One owner-uploaded soundtrack, private object storage, current room authorization.
BEGIN;
CREATE SCHEMA IF NOT EXISTS dormspace_music;
REVOKE ALL ON SCHEMA dormspace_music FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SCHEMA dormspace_music TO service_role;
CREATE TABLE IF NOT EXISTS dormspace_music.tracks (
 owner_id bigint PRIMARY KEY REFERENCES socialu.students(student_id),
 storage_key text NOT NULL UNIQUE,
 title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
 version uuid NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE dormspace_music.tracks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE dormspace_music.tracks FROM PUBLIC,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION dormspace_music.operate(p_auth_id uuid,p_session uuid,p_connection uuid,p_owner text,p_action text,p_payload jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE me bigint; target bigint; old_key text; track dormspace_music.tracks%ROWTYPE;
BEGIN
 me := public.socialu_require_student(p_auth_id);
 SELECT student_id INTO target FROM socialu.students WHERE username=p_owner AND is_active;
 IF target IS NULL OR NOT coalesce((public.socialu_dorm('access',p_auth_id,p_owner,'{}')->>'allowed')::boolean,false)
 THEN RAISE EXCEPTION 'This room is not available.' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM dormspace_live.players p WHERE p.student_id=me AND p.session_id=p_session
   AND p.connection_id=p_connection AND p.room_owner_id=target AND p.space='room:'||target::text AND dormspace_live.valid_player(p))
 THEN RAISE EXCEPTION 'Open this room before listening to its music.' USING ERRCODE='42501'; END IF;
 IF p_action IS NULL OR p_action NOT IN ('read','save','remove') THEN RAISE EXCEPTION 'Choose a music action.' USING ERRCODE='22023'; END IF;
 IF p_action<>'read' THEN
  IF me<>target THEN RAISE EXCEPTION 'Only the room owner can change its soundtrack.' USING ERRCODE='42501'; END IF;
  PERFORM 1 FROM socialu.students WHERE student_id=target FOR UPDATE;
  SELECT storage_key INTO old_key FROM dormspace_music.tracks WHERE owner_id=target;
  IF p_action='remove' THEN DELETE FROM dormspace_music.tracks WHERE owner_id=target;
  ELSE
   IF coalesce(p_payload->>'storageKey','') !~ ('^'||p_auth_id::text||'/[0-9a-f-]{36}[.]mp3$')
    OR char_length(btrim(coalesce(p_payload->>'title',''))) NOT BETWEEN 1 AND 120
   THEN RAISE EXCEPTION 'Choose a valid MP3 soundtrack.' USING ERRCODE='22023'; END IF;
   INSERT INTO dormspace_music.tracks VALUES(target,p_payload->>'storageKey',btrim(p_payload->>'title'),gen_random_uuid(),clock_timestamp())
   ON CONFLICT(owner_id) DO UPDATE SET storage_key=EXCLUDED.storage_key,title=EXCLUDED.title,version=EXCLUDED.version,updated_at=EXCLUDED.updated_at;
  END IF;
 END IF;
 SELECT * INTO track FROM dormspace_music.tracks WHERE owner_id=target;
 RETURN jsonb_build_object('isOwner',me=target,'oldKey',old_key,'track',CASE WHEN track.owner_id IS NULL THEN NULL ELSE
  jsonb_build_object('storageKey',track.storage_key,'title',track.title,'version',track.version) END);
END; $$;
REVOKE ALL ON FUNCTION dormspace_music.operate(uuid,uuid,uuid,text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION dormspace_music.operate(uuid,uuid,uuid,text,text,jsonb) TO service_role;
CREATE OR REPLACE FUNCTION public.socialu_dorm_music(p_auth_id uuid,p_session uuid,p_connection uuid,p_owner text,p_action text,p_payload jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
 SELECT dormspace_music.operate(p_auth_id,p_session,p_connection,p_owner,p_action,p_payload);
$$;
REVOKE ALL ON FUNCTION public.socialu_dorm_music(uuid,uuid,uuid,text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_dorm_music(uuid,uuid,uuid,text,text,jsonb) TO service_role;
-- Storage has no public or authenticated object policies. Server-signed uploads are bounded by bucket settings.
DO $$ BEGIN
 IF to_regclass('storage.buckets') IS NOT NULL THEN
  INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
  VALUES('dormspace-music','dormspace-music',false,20971520,ARRAY['audio/mpeg'])
  ON CONFLICT(id) DO UPDATE SET public=false,file_size_limit=20971520,allowed_mime_types=ARRAY['audio/mpeg'];
 END IF;
END; $$;
NOTIFY pgrst,'reload schema';
COMMIT;
