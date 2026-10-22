import Stripe from "stripe";
import {
  grantFromCheckoutSession,
  markCheckoutFailed,
  paymentIntentFromStripe,
  revokeByPaymentIntent,
  type FulfillmentDeps,
} from "./stripe-fulfillment";
import { getStripe } from "./stripe-server";

export class WebhookSignatureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookSignatureError";
  }
}

export function verifyStripeWebhook(
  payload: string | Buffer,
  signature: string | null | undefined,
  secret: string | undefined,
  stripe: Stripe = getWebhookStripe(),
): Stripe.Event {
  if (!secret) {
    throw new WebhookSignatureError("STRIPE_WEBHOOK_SECRET is not configured.");
  }
  if (!signature) {
    throw new WebhookSignatureError("Missing Stripe-Signature header.");
  }
  try {
    return stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid Stripe webhook signature.";
    throw new WebhookSignatureError(message);
  }
}

export function getWebhookStripe(): Stripe {
  if (process.env.STRIPE_SECRET_KEY?.trim()) {
    return getStripe();
  }
  return new Stripe("sk_test_webhook_verify_only");
}

export type WebhookProcessResult = {
  status: number;
  body: { received?: boolean; error?: string };
};

/**
 * Verify the raw body before any fulfillment. `handle` runs only after the signature matches.
 */
export async function processWebhookRequest(input: {
  payload: string;
  signature: string | null;
  secret: string | undefined;
  stripe?: Stripe;
  handle: (event: Stripe.Event) => Promise<void>;
}): Promise<WebhookProcessResult> {
  if (!input.secret) {
    return { status: 500, body: { error: "Webhook is not configured." } };
  }
  let event: Stripe.Event;
  try {
    event = verifyStripeWebhook(input.payload, input.signature, input.secret, input.stripe);
  } catch (error) {
    if (error instanceof WebhookSignatureError) {
      return { status: 400, body: { error: "Invalid webhook signature." } };
    }
    return { status: 400, body: { error: "Invalid webhook signature." } };
  }
  if (event.livemode) {
    return { status: 400, body: { error: "Live mode events are rejected." } };
  }
  await input.handle(event);
  return { status: 200, body: { received: true } };
}

export async function handleStripeEvent(event: Stripe.Event, deps: FulfillmentDeps): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status !== "paid") return;
      await grantFromCheckoutSession(session, deps);
      return;
    }
    case "checkout.session.async_payment_failed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await markCheckoutFailed(deps, session);
      return;
    }
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId = paymentIntentFromStripe(charge.payment_intent);
      if (!paymentIntentId) return;
      await revokeByPaymentIntent(deps, paymentIntentId, "refund");
      return;
    }
    case "charge.dispute.created": {
      const dispute = event.data.object as Stripe.Dispute;
      const paymentIntentId = paymentIntentFromStripe(dispute.payment_intent);
      if (!paymentIntentId) return;
      await revokeByPaymentIntent(deps, paymentIntentId, "dispute");
      return;
    }
    default:
      return;
  }
}

export async function lookupProcessorFeePence(paymentIntentId: string): Promise<number> {
  if (!paymentIntentId.startsWith("pi_")) return 0;
  try {
    const paymentIntent = await getStripe().paymentIntents.retrieve(paymentIntentId, {
      expand: ["latest_charge.balance_transaction"],
    });
    const charge = paymentIntent.latest_charge;
    if (!charge || typeof charge === "string") return 0;
    const balance = charge.balance_transaction;
    if (!balance || typeof balance === "string") return 0;
    return typeof balance.fee === "number" ? balance.fee : 0;
  } catch {
    return 0;
  }
}
