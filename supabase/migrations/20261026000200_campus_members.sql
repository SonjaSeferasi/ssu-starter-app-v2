-- Registered campus directory; no online-presence inference and no email addresses returned.
CREATE OR REPLACE FUNCTION public.socialu_campus_members(
  p_auth_id UUID, p_query TEXT DEFAULT '', p_offset INTEGER DEFAULT 0
) RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE me BIGINT; result JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  IF p_offset IS NULL OR p_offset < 0 OR p_offset > 1000000 OR length(coalesce(p_query,'')) > 100 THEN
    RAISE EXCEPTION 'Invalid member search.' USING ERRCODE='22023';
  END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(member) ORDER BY lower(member.name), member.username), '[]'::jsonb)
  INTO result FROM (
    SELECT s.username, coalesce(p.display_name,s.full_name) AS name,
      m.storage_key AS photo_key, s.student_id=me AS is_me
    FROM socialu.students s
    JOIN auth.users a ON a.id=s.auth_user_id
    LEFT JOIN socialu.student_profiles p ON p.student_id=s.student_id
    LEFT JOIN socialu.media_assets m ON m.asset_id=p.photo_id
    WHERE socialu.same_school(me,s.student_id) AND s.is_active AND NOT s.reverification_required
      AND s.email_verified_at IS NOT NULL AND a.email_confirmed_at IS NOT NULL
      AND lower(a.email)=lower(s.university_email)
      AND NOT socialu.is_blocked(me,s.student_id)
      AND (coalesce(btrim(p_query),'')='' OR strpos(lower(s.username),lower(btrim(p_query)))>0
        OR strpos(lower(coalesce(p.display_name,s.full_name)),lower(btrim(p_query)))>0)
    ORDER BY lower(coalesce(p.display_name,s.full_name)),s.username
    LIMIT 21 OFFSET p_offset
  ) member;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_campus_members(UUID,TEXT,INTEGER) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_campus_members(UUID,TEXT,INTEGER) TO service_role;
NOTIFY pgrst,'reload schema';
