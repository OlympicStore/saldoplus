import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "sp_visit_sid";
const LOGGED_KEY = "sp_visit_logged"; // per session+path dedupe

function getSessionId(): string {
  try {
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return "anon";
  }
}

function detectDevice(): string {
  const ua = navigator.userAgent.toLowerCase();
  if (/tablet|ipad/.test(ua)) return "tablet";
  if (/mobile|iphone|android/.test(ua)) return "mobile";
  return "desktop";
}

export const useTrackVisit = () => {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    // Only track public marketing/entry pages — skip in-app noise
    const trackable = ["/", "/auth", "/pricing", "/termos", "/privacidade"];
    if (!trackable.includes(path)) return;

    const sid = getSessionId();
    const key = `${LOGGED_KEY}:${sid}:${path}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {}

    const params = new URLSearchParams(location.search);
    supabase.from("site_visits").insert({
      session_id: sid,
      path,
      referrer: document.referrer || null,
      user_agent: navigator.userAgent.slice(0, 500),
      device: detectDevice(),
      utm_source: params.get("utm_source"),
      utm_medium: params.get("utm_medium"),
      utm_campaign: params.get("utm_campaign"),
    }).then(() => {}, () => {});
  }, [location.pathname]);
};
