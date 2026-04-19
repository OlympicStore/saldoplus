// Stripe payment links per plan (one-off, 1-year access).
// Keep in sync with Pricing.tsx PLANS.
export const PAYMENT_LINKS: Record<string, string> = {
  essencial: "https://buy.stripe.com/14A8wP6neamK7BFfUgbMQ0j",
  casa: "https://buy.stripe.com/cNiaEXh1S9iGe030ZmbMQ0k",
  pro: "https://buy.stripe.com/fZu28r9zqbqO3lpcI4bMQ0l",
};

export const PLAN_LABELS: Record<string, string> = {
  essencial: "Essencial",
  casa: "Casa",
  pro: "Pro",
};

export const PLAN_ORDER = ["essencial", "casa", "pro"] as const;

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
