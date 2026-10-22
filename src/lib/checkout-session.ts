import { randomBytes, randomUUID } from "node:crypto";
import type Stripe from "stripe";
import {
  MEAL_PRICE_PENCE,
  MEAL_PRODUCT,
  UNLOCK_CURRENCY,
  UNLOCK_PRICE_PENCE,
  WORKOUT_PRODUCT,
} from "./unlock";

const IDEMPOTENCY_KEY = /^[A-Za-z0-9:_-]{8,255}$/;
const LETTERS = "abcdefghijklmnopqrstuvwxyz";

const integrationSuffix = randomLetters(8);

export function randomLetters(length: number): string {
  let out = "";
  while (out.length < length) {
    const bytes = randomBytes(length);
    for (const byte of bytes) {
      // 26 * 9 = 234. Reject the tail so modulo bias stays small.
      if (byte < 234) {
        out += LETTERS[byte % 26];
        if (out.length === length) break;
      }
    }
  }
  return out;
}

export function integrationIdentifier(product: "workout" | "meal"): string {
  return product === "meal"
    ? `todays_session_meal_${integrationSuffix}`
    : `todays_session_workout_${integrationSuffix}`;
}

export function checkoutIdempotencyKey(requested: unknown): string {
  if (typeof requested === "string" && IDEMPOTENCY_KEY.test(requested)) {
    return requested;
  }
  return `checkout_${randomUUID()}`;
}

export function newOrderId(): string {
  return `ord_${randomUUID()}`;
}

export type CheckoutDraft = {
  product: "workout" | "meal";
  mealId?: string;
  origin: string;
  idempotencyKey: string;
  orderId: string;
  browserSub: string;
  integrationId?: string;
};

export function buildCheckoutSessionCreate(draft: CheckoutDraft): {
  params: Stripe.Checkout.SessionCreateParams;
  options: { idempotencyKey: string };
} {
  const meal = draft.product === "meal";
  const mealId = draft.mealId?.trim() ?? "";
  const metadata: Stripe.MetadataParam = {
    product: meal ? MEAL_PRODUCT : WORKOUT_PRODUCT,
    order_id: draft.orderId,
    browser_sub: draft.browserSub,
  };
  if (meal) metadata.mealId = mealId;

  const params: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    currency: UNLOCK_CURRENCY,
    client_reference_id: draft.orderId,
    integration_identifier: draft.integrationId ?? integrationIdentifier(draft.product),
    metadata,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: UNLOCK_CURRENCY,
          unit_amount: meal ? MEAL_PRICE_PENCE : UNLOCK_PRICE_PENCE,
          product_data: meal
            ? {
                name: "Meal prep idea",
                description: "One-time 50p unlock for this meal prep idea and its method.",
              }
            : {
                name: "Today's Session workout unlock",
                description: "One-time access to workout ideas for Supps n Social customers.",
              },
        },
      },
    ],
    success_url: meal
      ? `${draft.origin}/?meal_session_id={CHECKOUT_SESSION_ID}`
      : `${draft.origin}/?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: meal ? `${draft.origin}/?meal_checkout=cancelled` : `${draft.origin}/?checkout=cancelled`,
  };

  return {
    params,
    options: { idempotencyKey: draft.idempotencyKey },
  };
}
