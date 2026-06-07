
-- Lock down SECURITY DEFINER functions: revoke broad EXECUTE; grant only to needed roles
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_profile_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_admin_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_stats() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.soft_delete_user_data(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.restore_user_after_subscription(uuid) FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_partner_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_consultant_partner_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_consultant_client_ids(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.verify_invite_code(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.join_group_with_invite(uuid, text) FROM PUBLIC, anon;
