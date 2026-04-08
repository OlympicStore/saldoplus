// Facebook Pixel helper — wraps fbq calls with type safety

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
  }
}

export const fbTrack = (event: string, params?: Record<string, any>) => {
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", event, params);
  }
};

export const fbTrackPageView = () => fbTrack("PageView");
export const fbTrackLead = () => fbTrack("Lead");
export const fbTrackInitiateCheckout = (plan: string, value: number) =>
  fbTrack("InitiateCheckout", { content_name: plan, currency: "EUR", value });
export const fbTrackPurchase = (plan: string, value: number) =>
  fbTrack("Purchase", { content_name: plan, currency: "EUR", value });
