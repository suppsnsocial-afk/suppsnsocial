import Stripe from "stripe";
import {
  MEAL_PRICE_LABEL,
  UNLOCK_PRICE_LABEL,
  type UnlockConfig,
} from "./unlock";

const TEST_SECRET_PREFIXES = ["sk_test_", "rk_test_"] as const;
const DEV_ORIGIN = "http://localhost:3000";

let stripeClient: { key: string; client: Stripe } | null = null;

export function isDemoUnlockEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV !== "production" && env.DEMO_UNLOCK === "true";
}

export function isTestStripeSecret(key: string): boolean {
  return TEST_SECRET_PREFIXES.some((prefix) => key.startsWith(prefix));
}

export function isTestStripePublishable(key: string): boolean {
  return key.startsWith("pk_test_");
}

export function assertTestStripeSecret(key: string): void {
  if (!isTestStripeSecret(key)) {
    throw new Error("Refusing to use a Stripe secret key that is not a test key.");
  }
}

export function isStripeConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  const secret = env.STRIPE_SECRET_KEY?.trim() ?? "";
  const publishable = env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? "";
  return Boolean(secret && publishable && isTestStripeSecret(secret) && isTestStripePublishable(publishable));
}

export function getUnlockConfig(): UnlockConfig {
  return {
    stripeConfigured: isStripeConfigured(),
    demoUnlockAvailable: isDemoUnlockEnabled(),
    priceLabel: UNLOCK_PRICE_LABEL,
    mealPriceLabel: MEAL_PRICE_LABEL,
  };
}

export function getStripe(env: NodeJS.ProcessEnv = process.env): Stripe {
  const key = env.STRIPE_SECRET_KEY?.trim() ?? "";
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  assertTestStripeSecret(key);
  if (!stripeClient || stripeClient.key !== key) {
    stripeClient = { key, client: new Stripe(key) };
  }
  return stripeClient.client;
}

/**
 * Checkout redirect origin. Production must set NEXT_PUBLIC_APP_URL.
 * Host and X-Forwarded-Host are never read.
 */
export function appOrigin(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (configured) {
    let url: URL;
    try {
      url = new URL(configured);
    } catch {
      throw new Error("NEXT_PUBLIC_APP_URL must be an absolute http(s) URL.");
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("NEXT_PUBLIC_APP_URL must be an absolute http(s) URL.");
    }
    if (url.username || url.password) {
      throw new Error("NEXT_PUBLIC_APP_URL must not include credentials.");
    }
    return url.origin;
  }
  if (env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_APP_URL is required in production.");
  }
  return DEV_ORIGIN;
}

export function isCheckoutPaid(session: { payment_status?: string | null }): boolean {
  return session.payment_status === "paid";
}

export function resetStripeClientForTests(): void {
  stripeClient = null;
}
