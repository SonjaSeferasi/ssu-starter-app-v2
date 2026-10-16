-- UR-114–123: server-only friendship workflow over the existing relationship tables.
-- No student data or existing conversations are reset.
CREATE OR REPLACE FUNCTION public.socialu_relationship(p_me BIGINT, p_target BIGINT) RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT jsonb_build_object('state', CASE WHEN socialu.is_blocked(p_me,p_target) THEN 'blocked'
    WHEN f.status='accepted' THEN 'friends' WHEN f.sender_id=p_me THEN 'sent'
    WHEN f.recipient_id=p_me THEN 'received' ELSE 'none' END, 'request_id', f.request_id::text)
  FROM (SELECT 1) seed LEFT JOIN LATERAL (
    SELECT * FROM socialu.friend_requests WHERE least(sender_id,recipient_id)=least(p_me,p_target)
      AND greatest(sender_id,recipient_id)=greatest(p_me,p_target)
      AND (status='pending' OR (status='accepted' AND friendship_ended_at IS NULL)) LIMIT 1
  ) f ON true;
$$;
REVOKE ALL ON FUNCTION public.socialu_relationship(BIGINT,BIGINT) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.socialu_friendships(
  p_auth_id UUID, p_action TEXT, p_username TEXT DEFAULT NULL,
  p_request_id BIGINT DEFAULT NULL, p_query TEXT DEFAULT '', p_offset INTEGER DEFAULT 0
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; target BIGINT; current_request socialu.friend_requests%ROWTYPE; result JSONB; cid BIGINT;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  IF p_action IN ('friends','incoming','outgoing','blocked','discover') THEN
    IF p_offset IS NULL OR p_offset < 0 OR p_offset > 10000 OR length(coalesce(p_query,'')) > 100 THEN
      RAISE EXCEPTION 'Invalid search.' USING ERRCODE='22023';
    END IF;
    SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY lower(r.name),r.username), '[]'::jsonb) INTO result FROM (
      SELECT s.username, coalesce(sp.display_name,s.full_name) AS name, s.full_name,
        m.storage_key AS photo_key, public.socialu_relationship(me,s.student_id) AS relationship
      FROM socialu.students s LEFT JOIN socialu.student_profiles sp USING(student_id)
      LEFT JOIN socialu.media_assets m ON m.asset_id=sp.photo_id
      WHERE s.student_id<>me
        AND (p_action='blocked' OR (s.is_active AND NOT socialu.is_blocked(me,s.student_id)))
        AND (coalesce(p_query,'')='' OR strpos(lower(s.full_name),lower(btrim(p_query)))>0
          OR strpos(lower(coalesce(sp.display_name,'')),lower(btrim(p_query)))>0
          OR strpos(lower(s.username),lower(btrim(p_query)))>0)
        AND CASE p_action
          WHEN 'friends' THEN socialu.are_friends(me,s.student_id)
          WHEN 'incoming' THEN EXISTS(SELECT 1 FROM socialu.friend_requests f WHERE f.sender_id=s.student_id AND f.recipient_id=me AND f.status='pending')
          WHEN 'outgoing' THEN EXISTS(SELECT 1 FROM socialu.friend_requests f WHERE f.sender_id=me AND f.recipient_id=s.student_id AND f.status='pending')
          WHEN 'blocked' THEN EXISTS(SELECT 1 FROM socialu.student_blocks b WHERE b.blocker_id=me AND b.blocked_id=s.student_id)
          ELSE length(btrim(coalesce(p_query,'')))>=2 END
      ORDER BY lower(coalesce(sp.display_name,s.full_name)),s.username LIMIT 21 OFFSET p_offset
    ) r;
    RETURN result;
  END IF;
  IF p_username IS NULL OR btrim(p_username)='' THEN RAISE EXCEPTION 'Choose a student.' USING ERRCODE='22023'; END IF;
  SELECT student_id INTO target FROM socialu.students WHERE username=btrim(p_username);
  IF target IS NULL OR target=me THEN RAISE EXCEPTION 'Student not available.' USING ERRCODE='P0002'; END IF;
  -- Every mutation takes the same ordered pair of locks, including reverse requests.
  -- Deactivation also locks the student row, so requests cannot race it.
  PERFORM student_id FROM socialu.students WHERE student_id IN(me,target) ORDER BY student_id FOR UPDATE;
  PERFORM public.socialu_require_student(p_auth_id);
  IF p_action='unblock' THEN
    DELETE FROM socialu.student_blocks WHERE blocker_id=me AND blocked_id=target;
    RETURN jsonb_build_object('unblocked',true);
  END IF;
  IF NOT EXISTS(SELECT 1 FROM socialu.students WHERE student_id=target AND is_active)
    OR (socialu.is_blocked(me,target) AND NOT (p_action='block' AND EXISTS(SELECT 1 FROM socialu.student_blocks WHERE blocker_id=me AND blocked_id=target))) THEN
    RAISE EXCEPTION 'Student not available.' USING ERRCODE='P0002';
  END IF;
  SELECT * INTO current_request FROM socialu.friend_requests
    WHERE least(sender_id,recipient_id)=least(me,target) AND greatest(sender_id,recipient_id)=greatest(me,target)
    AND (status='pending' OR (status='accepted' AND friendship_ended_at IS NULL)) FOR UPDATE;
  IF p_action='send' THEN
    IF current_request.request_id IS NULL THEN
      INSERT INTO socialu.friend_requests(sender_id,recipient_id) VALUES(me,target);
    END IF;
  ELSIF p_action IN ('accept','decline','cancel','remove') THEN
    IF current_request.request_id IS NULL OR p_request_id IS DISTINCT FROM current_request.request_id THEN
      RAISE EXCEPTION 'This connection changed. Refresh and try again.' USING ERRCODE='40001';
    END IF;
    IF p_action IN ('accept','decline') THEN
      IF current_request.status<>'pending' OR current_request.recipient_id<>me THEN
        RAISE EXCEPTION 'Only the recipient can respond to this request.' USING ERRCODE='42501';
      END IF;
      UPDATE socialu.friend_requests SET status=CASE WHEN p_action='accept' THEN 'accepted' ELSE 'declined' END,
        decided_at=clock_timestamp() WHERE request_id=current_request.request_id;
    ELSIF p_action='cancel' THEN
      IF current_request.status<>'pending' OR current_request.sender_id<>me THEN
        RAISE EXCEPTION 'Only the sender can cancel this request.' USING ERRCODE='42501';
      END IF;
      UPDATE socialu.friend_requests SET status='canceled',decided_at=clock_timestamp() WHERE request_id=current_request.request_id;
    ELSE
      IF current_request.status<>'accepted' THEN RAISE EXCEPTION 'This friendship is no longer active.' USING ERRCODE='40001'; END IF;
      UPDATE socialu.friend_requests SET friendship_ended_at=clock_timestamp() WHERE request_id=current_request.request_id;
    END IF;
  ELSIF p_action='block' THEN
    INSERT INTO socialu.student_blocks VALUES(me,target) ON CONFLICT DO NOTHING;
    -- Existing block_cleanup ends friendships and pending requests atomically.
    -- Old messaging consent and follows must not silently return after unblocking.
    UPDATE socialu.message_requests SET status='declined',decided_at=clock_timestamp()
      WHERE least(sender_id,recipient_id)=least(me,target) AND greatest(sender_id,recipient_id)=greatest(me,target) AND status IN ('pending','accepted');
    DELETE FROM socialu.student_follows WHERE (follower_id=me AND followed_id=target) OR (follower_id=target AND followed_id=me);
  ELSIF p_action='message' THEN
    IF NOT socialu.are_friends(me,target) THEN RAISE EXCEPTION 'Become friends before starting a conversation here.' USING ERRCODE='42501'; END IF;
    INSERT INTO socialu.conversations(kind,created_by,private_student_low,private_student_high)
      VALUES('private',me,least(me,target),greatest(me,target)) ON CONFLICT(private_student_low,private_student_high) DO NOTHING;
    SELECT conversation_id INTO cid FROM socialu.conversations WHERE private_student_low=least(me,target) AND private_student_high=greatest(me,target);
    RETURN jsonb_build_object('conversation_id',cid::text);
  ELSIF p_action<>'relation' THEN
    RAISE EXCEPTION 'Unsupported friendship action.' USING ERRCODE='22023';
  END IF;
  RETURN public.socialu_relationship(me,target);
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_friendships(UUID,TEXT,TEXT,BIGINT,TEXT,INTEGER) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_friendships(UUID,TEXT,TEXT,BIGINT,TEXT,INTEGER) TO service_role;

CREATE OR REPLACE FUNCTION public.socialu_account_lifecycle(p_auth_id UUID,p_action TEXT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s socialu.students%ROWTYPE; a auth.users%ROWTYPE;
BEGIN
  SELECT * INTO a FROM auth.users WHERE id=p_auth_id;
  IF NOT FOUND OR a.email_confirmed_at IS NULL THEN RAISE EXCEPTION 'Verify your university account.' USING ERRCODE='42501'; END IF;
  SELECT * INTO s FROM socialu.students WHERE auth_user_id=p_auth_id FOR UPDATE;
  IF NOT FOUND THEN
    IF p_action='status' THEN RETURN jsonb_build_object('is_active',true); END IF;
    RAISE EXCEPTION 'Create your profile first.' USING ERRCODE='P0002';
  END IF;
  IF s.reverification_required OR s.email_verified_at IS NULL OR lower(a.email)<>lower(s.university_email) THEN
    RAISE EXCEPTION 'Verify your university account.' USING ERRCODE='42501';
  END IF;
  IF p_action='deactivate' THEN
    UPDATE socialu.students SET is_active=false WHERE student_id=s.student_id;
    PERFORM public.socialu_session_guard('revoke_all',p_auth_id,NULL,NULL);
    RETURN jsonb_build_object('is_active',false);
  ELSIF p_action='reactivate' THEN
    UPDATE socialu.students SET is_active=true WHERE student_id=s.student_id;
    RETURN jsonb_build_object('is_active',true);
  ELSIF p_action<>'status' THEN RAISE EXCEPTION 'Unsupported account action.' USING ERRCODE='22023'; END IF;
  RETURN jsonb_build_object('is_active',s.is_active);
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_account_lifecycle(UUID,TEXT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_account_lifecycle(UUID,TEXT) TO service_role;

-- Inactive students retain friendships but cannot grant private access or receive messages.
CREATE OR REPLACE FUNCTION socialu.are_friends(a BIGINT,b BIGINT) RETURNS BOOLEAN
LANGUAGE sql STABLE SET search_path=socialu,pg_catalog AS $$
 SELECT EXISTS(SELECT 1 FROM current_friendships f JOIN students x ON x.student_id=f.student_low JOIN students y ON y.student_id=f.student_high
   WHERE f.student_low=least(a,b) AND f.student_high=greatest(a,b) AND x.is_active AND y.is_active AND NOT is_blocked(a,b));
$$;
CREATE OR REPLACE FUNCTION socialu.can_send_private(a BIGINT,b BIGINT) RETURNS BOOLEAN
LANGUAGE sql STABLE SET search_path=socialu,pg_catalog AS $$
 SELECT EXISTS(SELECT 1 FROM students WHERE student_id=a AND is_active) AND EXISTS(SELECT 1 FROM students WHERE student_id=b AND is_active)
 AND NOT is_blocked(a,b) AND (are_friends(a,b) OR EXISTS(SELECT 1 FROM message_requests m WHERE m.status='accepted'
   AND least(m.sender_id,m.recipient_id)=least(a,b) AND greatest(m.sender_id,m.recipient_id)=greatest(a,b)
   AND NOT EXISTS(SELECT 1 FROM friend_requests f WHERE least(f.sender_id,f.recipient_id)=least(a,b)
     AND greatest(f.sender_id,f.recipient_id)=greatest(a,b) AND f.friendship_ended_at IS NOT NULL AND f.friendship_ended_at>=m.created_at)));
$$;
NOTIFY pgrst,'reload schema';

-- Display the actual recipient when entering an existing friend conversation.
CREATE OR REPLACE FUNCTION public.socialu_friend_conversation(p_auth_id UUID,p_conversation_id BIGINT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE me BIGINT; c socialu.conversations%ROWTYPE; peer BIGINT; result JSONB;
BEGIN
  me:=public.socialu_require_student(p_auth_id);
  SELECT * INTO c FROM socialu.conversations WHERE conversation_id=p_conversation_id;
  IF NOT FOUND OR c.kind<>'private' OR me NOT IN(c.private_student_low,c.private_student_high) THEN
    RAISE EXCEPTION 'Conversation not available.' USING ERRCODE='P0002';
  END IF;
  peer:=CASE WHEN c.private_student_low=me THEN c.private_student_high ELSE c.private_student_low END;
  IF socialu.is_blocked(me,peer) OR NOT EXISTS(SELECT 1 FROM socialu.students WHERE student_id=peer AND is_active) THEN
    RAISE EXCEPTION 'Conversation not available.' USING ERRCODE='P0002';
  END IF;
  SELECT jsonb_build_object('name',coalesce(p.display_name,s.full_name),'username',s.username) INTO result
    FROM socialu.students s LEFT JOIN socialu.student_profiles p USING(student_id) WHERE s.student_id=peer;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_friend_conversation(UUID,BIGINT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_friend_conversation(UUID,BIGINT) TO service_role;
NOTIFY pgrst,'reload schema';

-- Hide deactivated authors in profile grids, including tagged content.
CREATE OR REPLACE FUNCTION public.socialu_profile_content(p_auth_id UUID, p_username TEXT, p_category TEXT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; target BIGINT; result JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  target := public.socialu_profile_target(me, p_username);
  IF p_category IS NULL OR p_category NOT IN ('posts', 'tagged') THEN
    RAISE EXCEPTION 'Choose Posts or Tagged.' USING ERRCODE = '22023';
  END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY c.published_at DESC), '[]'::jsonb) INTO result
  FROM (
    SELECT p.post_id, p.author_id, p.text_content, p.visibility, p.published_at, p.edited_at,
      coalesce(sp.display_name, s.full_name) AS author_name,
      am.storage_key AS author_photo_key,
      coalesce((SELECT jsonb_agg(jsonb_build_object('asset_id', pm.asset_id, 'storage_key', pm.storage_key))
                FROM socialu.post_photos pp JOIN socialu.media_assets pm ON pm.asset_id = pp.asset_id
                WHERE pp.post_id = p.post_id), '[]'::jsonb) AS photos
    FROM socialu.posts p
    JOIN socialu.students s ON s.student_id = p.author_id
    LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
    LEFT JOIN socialu.media_assets am ON am.asset_id = sp.photo_id
    WHERE CASE WHEN p_category = 'posts' THEN p.author_id = target
               ELSE EXISTS (SELECT 1 FROM socialu.post_tags t WHERE t.post_id = p.post_id AND t.student_id = target) END
      -- SRS-113.11/113.12: non-friends see Public posts; current friends also see Friends Only.
      AND (p.author_id = me OR p.visibility = 'public' OR socialu.are_friends(me, p.author_id))
      AND s.is_active AND (p.author_id = me OR NOT socialu.is_blocked(me, p.author_id))
  ) c;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_profile_content(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_profile_content(UUID, TEXT, TEXT) TO service_role;


NOTIFY pgrst,'reload schema';

-- Counts match the active friends list after blocking or deactivation.
CREATE OR REPLACE FUNCTION public.socialu_profile_view(p_auth_id UUID, p_username TEXT DEFAULT NULL) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  me BIGINT;
  target BIGINT;
  s socialu.students%ROWTYPE;
  p socialu.student_profiles%ROWTYPE;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  target := public.socialu_profile_target(me, p_username);
  SELECT * INTO s FROM socialu.students WHERE student_id = target;
  SELECT * INTO p FROM socialu.student_profiles WHERE student_id = target;
  RETURN jsonb_build_object(
    'id', s.student_id::text,
    'is_own', s.student_id = me,
    'username', s.username,
    'full_name', s.full_name,
    'display_name', p.display_name,
    'name', coalesce(p.display_name, s.full_name),
    'university', (SELECT u.name FROM socialu.university_domains d
                   JOIN socialu.university u ON u.university_id = d.university_id WHERE d.domain = s.email_domain),
    'major', p.major,
    'class_year', p.class_year,
    'bio', coalesce(p.bio, ''),
    'photo_key', (SELECT m.storage_key FROM socialu.media_assets m WHERE m.asset_id = p.photo_id),
    'setup_completed', coalesce(p.setup_completed, FALSE),
    -- SRS-110.6: only the owner needs to know when the display name may change again.
    'display_name_next_change_at', CASE WHEN s.student_id = me AND p.display_name_changed_at > now() - INTERVAL '7 days'
                                        THEN p.display_name_changed_at + INTERVAL '7 days' END,
    -- SRS-111.2/111.3: posts are separate from Snipes, and deleted posts are removed rows.
    'post_count', (SELECT count(*) FROM socialu.posts WHERE author_id = s.student_id),
    -- SRS-111.4-111.7: current accepted friendships only; ended and pending ones are excluded.
    'friend_count', (SELECT count(*) FROM socialu.current_friendships f WHERE s.student_id IN (f.student_low, f.student_high) AND socialu.are_friends(f.student_low, f.student_high)),
    'is_friend', s.student_id <> me AND socialu.are_friends(me, s.student_id),
    'friend_request', (SELECT CASE WHEN r.sender_id = me THEN 'sent' ELSE 'received' END FROM socialu.friend_requests r
                       WHERE r.status = 'pending' AND ((r.sender_id = me AND r.recipient_id = s.student_id)
                          OR (r.sender_id = s.student_id AND r.recipient_id = me)) LIMIT 1)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_profile_view(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_profile_view(UUID, TEXT) TO service_role;


NOTIFY pgrst,'reload schema';
