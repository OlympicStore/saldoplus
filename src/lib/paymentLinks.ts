// Stripe payment link helpers (V2 pricing).
// Source of truth for plan display data lives in `@/lib/plans`.
import { PLANS, PLAN_ORDER, PLAN_LABELS } from "./plans";

export { PLAN_LABELS, PLAN_ORDER };

/** Public Stripe hosted checkout links (kept for legacy fallback). */
export const PAYMENT_LINKS: Record<string, string> = {
  essencial: "https://buy.stripe.com/14A8wP6neamK7BFfUgbMQ0j",
  casa: "https://buy.stripe.com/cNiaEXh1S9iGe030ZmbMQ0k",
  pro: "https://buy.stripe.com/fZu28r9zqbqO3lpcI4bMQ0l",
};

export const openCheckout = (plan: string, email?: string | null) => {
  const link = PAYMENT_LINKS[plan];
  if (!link) return;
  const separator = link.includes("?") ? "&" : "?";
  const url = email
    ? `${link}${separator}prefilled_email=${encodeURIComponent(email)}`
    : link;
  window.open(url, "_blank");
};

/** Returns the next plan up, or null if already on the top plan. */
export const nextUpgradePlan = (current: string): string | null => {
  const idx = PLAN_ORDER.indexOf(current as (typeof PLAN_ORDER)[number]);
  if (idx === -1 || idx === PLAN_ORDER.length - 1) return null;
  return PLAN_ORDER[idx + 1];
};

/** Convenience re-export for legacy imports. */
export const PLAN_PRICES = {
  essencial: PLANS.essencial.price,
  casa: PLANS.casa.price,
  pro: PLANS.pro.price,
};
