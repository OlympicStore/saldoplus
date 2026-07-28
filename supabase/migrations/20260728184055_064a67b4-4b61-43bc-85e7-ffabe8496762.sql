DROP POLICY IF EXISTS "Anyone can insert visits" ON public.site_visits;

CREATE POLICY "Public can log visits with constraints"
ON public.site_visits
FOR INSERT
TO anon, authenticated
WITH CHECK (
  session_id IS NOT NULL
  AND length(session_id) BETWEEN 1 AND 128
  AND path IS NOT NULL
  AND length(path) BETWEEN 1 AND 512
  AND (referrer IS NULL OR length(referrer) <= 2048)
  AND (user_agent IS NULL OR length(user_agent) <= 512)
  AND (device IS NULL OR length(device) <= 32)
  AND (utm_source IS NULL OR length(utm_source) <= 128)
  AND (utm_medium IS NULL OR length(utm_medium) <= 128)
  AND (utm_campaign IS NULL OR length(utm_campaign) <= 128)
);