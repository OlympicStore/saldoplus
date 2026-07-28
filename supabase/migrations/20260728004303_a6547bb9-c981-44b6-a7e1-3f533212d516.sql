REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.email_queue_dispatch() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.email_queue_wake() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, authenticated;

ALTER FUNCTION public.delete_email(text, bigint) SET SEARCH_PATH = public;
ALTER FUNCTION public.email_queue_dispatch() SET SEARCH_PATH = public;
ALTER FUNCTION public.email_queue_wake() SET SEARCH_PATH = public;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET SEARCH_PATH = public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET SEARCH_PATH = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET SEARCH_PATH = public;