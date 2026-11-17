-- SRS-114.7 / #1227: carry exact displayed row IDs, including grouped likes.
DO $patch$
DECLARE source text;
BEGIN
  source := pg_get_functiondef('public.socialu_notifications(uuid)'::regprocedure);
  IF position('AS read_ids' in source)=0 THEN
    IF position('(n.read_at IS NULL) AS is_unread' in source)=0 OR position('NOT g.all_read AS is_unread' in source)=0 THEN
      RAISE EXCEPTION 'Unexpected notification feed definition';
    END IF;
    source := replace(source,'(n.read_at IS NULL) AS is_unread',
      '(n.read_at IS NULL) AS is_unread, jsonb_build_array(n.notification_id::text) AS read_ids');
    source := replace(source,'max(notification_id) AS notification_id,',
      'max(notification_id) AS notification_id, jsonb_agg(notification_id::text) AS read_ids,');
    source := replace(source,'NOT g.all_read AS is_unread','NOT g.all_read AS is_unread, g.read_ids AS read_ids');
    EXECUTE source;
  END IF;
END;
$patch$;
CREATE OR REPLACE FUNCTION public.socialu_mark_notification_snapshot_read(p_auth_id uuid,p_ids bigint[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE me bigint;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  IF p_ids IS NULL OR cardinality(p_ids)>10000 THEN
    RAISE EXCEPTION 'Invalid notification snapshot' USING ERRCODE='22023';
  END IF;
  UPDATE socialu.notifications SET read_at=CURRENT_TIMESTAMP
    WHERE recipient_id=me AND notification_id=ANY(p_ids) AND read_at IS NULL;
  RETURN jsonb_build_object('unread',(public.socialu_notifications(p_auth_id)->'unread'));
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_mark_notification_snapshot_read(uuid,bigint[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_mark_notification_snapshot_read(uuid,bigint[]) TO service_role;
NOTIFY pgrst,'reload schema';
