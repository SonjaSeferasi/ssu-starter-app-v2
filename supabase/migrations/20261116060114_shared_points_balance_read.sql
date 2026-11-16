-- SRS-533.2 / SRS-521: one account-wide balance, read only for the verified caller.
BEGIN;
CREATE OR REPLACE FUNCTION public.socialu_points_balance(p_auth_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE student bigint;
BEGIN
 student:=public.socialu_require_student(p_auth_id);
 RETURN jsonb_build_object('balance',coalesce((SELECT b.balance FROM socialu.points_balances b WHERE b.student_id=student),0));
END; $$;
REVOKE ALL ON FUNCTION public.socialu_points_balance(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_points_balance(uuid) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
