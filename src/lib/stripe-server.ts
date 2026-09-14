import Stripe from "stripe";
import { UNLOCK_PRICE_LABEL, type UnlockConfig } from "./unlock";

export function isDemoUnlockEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.DEMO_UNLOCK === "true";
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
}

export function getUnlockConfig(): UnlockConfig {
  return {
    stripeConfigured: isStripeConfigured(),
    demoUnlockAvailable: isDemoUnlockEnabled(),
    priceLabel: UNLOCK_PRICE_LABEL,
  };
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  return new Stripe(key);
}

export function appOrigin(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured) return configured;

  const url = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  return `${proto}://${host}`;
}

export function isPaidCheckoutSession(session: Stripe.Checkout.Session): boolean {
  return (
    session.metadata?.product === "todays-session-unlock" &&
    (session.payment_status === "paid" || session.status === "complete")
  );
}
