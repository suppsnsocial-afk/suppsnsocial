import { randomUUID } from "node:crypto";
import type Stripe from "stripe";
import { buildAccountancyRecord, type AccountancyRecord } from "./accountancy";
import type { EntitlementStore } from "./entitlement-store";
import {
  buildEntitlement,
  decideRedeem,
  ledgerStatusForRevoke,
  revokeEntitlementRecord,
  viewFromEntitlements,
  type Entitlement,
  type LedgerStatus,
  type RevokeReason,
} from "./entitlements";
import {
  MEAL_PRICE_PENCE,
  MEAL_PRODUCT,
  UNLOCK_CURRENCY,
  UNLOCK_PRICE_PENCE,
  WORKOUT_PRODUCT,
  type UnlockProduct,
} from "./unlock";
import { isBrowserSub } from "./unlock-cookie";

const ledgerLocks = new Map<string, Promise<void>>();

async function withLedgerLock(key: string, operation: () => Promise<void>): Promise<void> {
  const previous = ledgerLocks.get(key) ?? Promise.resolve();
  let release: () => void = () => undefined;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  const tail = previous.then(() => current);
  ledgerLocks.set(key, tail);
  await previous;
  try {
    await operation();
  } finally {
    release();
    if (ledgerLocks.get(key) === tail) ledgerLocks.delete(key);
  }
}

export type CheckoutGrantSource = {
  id: string;
  livemode?: boolean | null;
  payment_status?: string | null;
  currency?: string | null;
  amount_total?: number | null;
  payment_intent?: string | { id: string } | null;
  payment_method_types?: string[] | null;
  metadata?: {
    product?: string | null;
    mealId?: string | null;
    order_id?: string | null;
    browser_sub?: string | null;
  } | null;
};

export type FulfillmentDeps = {
  store: EntitlementStore;
  isKnownMealId: (mealId: string) => boolean;
  appendLedger: (record: AccountancyRecord) => Promise<void>;
  processorFeePence?: (paymentIntentId: string) => Promise<number>;
  now?: () => Date;
};

export type GrantResult =
  | { ok: true; entitlement: Entitlement; created: boolean }
  | { ok: false; status: number; error: string; code: "unpaid" | "invalid" | "live" | "failed" };

function paymentIntentId(value: CheckoutGrantSource["payment_intent"]): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

function catalog(source: CheckoutGrantSource, isKnownMealId: (mealId: string) => boolean):
  | {
      product: "workout" | "meal";
      mealId: string | null;
      amountPence: number;
      sku: string;
      description: string;
    }
  | { error: string } {
  const product = source.metadata?.product;
  if (product === WORKOUT_PRODUCT) {
    return {
      product: "workout",
      mealId: null,
      amountPence: UNLOCK_PRICE_PENCE,
      sku: WORKOUT_PRODUCT,
      description: "Today's Session workout unlock",
    };
  }
  if (product === MEAL_PRODUCT) {
    const mealId = source.metadata?.mealId?.trim() ?? "";
    if (!mealId || !isKnownMealId(mealId)) {
      return { error: "That meal prep idea was not found." };
    }
    return {
      product: "meal",
      mealId,
      amountPence: MEAL_PRICE_PENCE,
      sku: MEAL_PRODUCT,
      description: `Meal prep idea (${mealId})`,
    };
  }
  return { error: "This checkout session is not a Today's Session purchase." };
}

export async function grantFromCheckoutSession(
  source: CheckoutGrantSource,
  deps: FulfillmentDeps,
): Promise<GrantResult> {
  if (source.livemode) {
    return { ok: false, status: 400, code: "live", error: "Live mode payments are not accepted." };
  }
  if (source.payment_status !== "paid") {
    return {
      ok: false,
      status: 402,
      code: "unpaid",
      error: "Payment is not complete yet.",
    };
  }
  if (await deps.store.isFailed(source.id)) {
    return { ok: false, status: 402, code: "failed", error: "This payment failed and was not unlocked." };
  }

  const item = catalog(source, deps.isKnownMealId);
  if ("error" in item) {
    return { ok: false, status: 400, code: "invalid", error: item.error };
  }
  if (source.currency !== UNLOCK_CURRENCY) {
    return { ok: false, status: 400, code: "invalid", error: "This checkout was not charged in GBP." };
  }
  if (source.amount_total !== item.amountPence) {
    return { ok: false, status: 400, code: "invalid", error: "The amount paid does not match the price." };
  }

  const browserSub = source.metadata?.browser_sub?.trim() ?? "";
  if (!isBrowserSub(browserSub)) {
    return { ok: false, status: 400, code: "invalid", error: "This checkout is not bound to a browser." };
  }

  const paymentIntent = paymentIntentId(source.payment_intent);
  const fee = paymentIntent ? await (deps.processorFeePence?.(paymentIntent) ?? Promise.resolve(0)) : 0;
  let entitlement: Entitlement;
  try {
    entitlement = buildEntitlement({
      paymentStatus: source.payment_status,
      checkoutSessionId: source.id,
      paymentIntentId: paymentIntent,
      browserSub,
      orderId: source.metadata?.order_id?.trim() || source.id,
      product: item.product,
      mealId: item.mealId,
      amountPence: item.amountPence,
      paymentMethod: source.payment_method_types?.find(Boolean) || "card",
      processorFeePence: fee,
      now: deps.now?.(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not grant this payment.";
    const live = error instanceof Error && "code" in error && error.code === "live";
    return { ok: false, status: 400, code: live ? "live" : "invalid", error: message };
  }

  const saved = await deps.store.insertEntitlement(entitlement);
  const created = saved.id === entitlement.id;
  if (saved.status === "active") {
    await recordLedgerOnce(deps, saved, "paid");
  }
  return { ok: true, entitlement: saved, created };
}

export async function grantDemoAccess(
  deps: FulfillmentDeps,
  input: { browserSub: string; product: UnlockProduct; mealId: string | null; now?: Date },
): Promise<Entitlement> {
  const amountPence = input.product === "meal" ? MEAL_PRICE_PENCE : UNLOCK_PRICE_PENCE;
  const entitlement = buildEntitlement({
    paymentStatus: "paid",
    checkoutSessionId: `demo_cs_${randomUUID()}`,
    paymentIntentId: `demo_pi_${randomUUID()}`,
    browserSub: input.browserSub,
    orderId: `ord_demo_${randomUUID()}`,
    product: input.product,
    mealId: input.mealId,
    amountPence,
    paymentMethod: "demo",
    processorFeePence: 0,
    demo: true,
    now: input.now,
  });
  const saved = await deps.store.insertEntitlement(entitlement);
  await deps.store.tryClaim(saved.checkoutSessionId, {
    entitlementId: saved.id,
    browserSub: input.browserSub,
    claimedAt: (input.now ?? new Date()).toISOString(),
  });
  await recordLedgerOnce(deps, saved, "paid");
  return saved;
}

export async function redeemCheckoutSession(
  store: EntitlementStore,
  checkoutSessionId: string,
  browserSub: string,
): Promise<
  | { ok: true; entitlement: Entitlement }
  | { ok: false; status: number; error: string; code: "replay" | "not_found" | "revoked" | "failed" | "mismatch" }
> {
  const [entitlement, failed, claim] = await Promise.all([
    store.getByCheckoutSession(checkoutSessionId),
    store.isFailed(checkoutSessionId),
    store.getClaim(checkoutSessionId),
  ]);
  const decision = decideRedeem({ entitlement, failed, claim, browserSub });
  if (!decision.ok) {
    const status = decision.reason === "replay" ? 409 : decision.reason === "not_found" ? 404 : 402;
    const error =
      decision.reason === "replay"
        ? "This checkout session has already been used."
        : decision.reason === "revoked"
          ? "This payment was refunded or disputed."
          : decision.reason === "failed"
            ? "This payment failed and was not unlocked."
            : "No entitlement is stored for this checkout session.";
    return { ok: false, status, error, code: decision.reason };
  }
  if ("action" in decision && decision.action === "claim") {
    const claimed = await store.tryClaim(checkoutSessionId, {
      entitlementId: decision.entitlement.id,
      browserSub,
      claimedAt: new Date().toISOString(),
    });
    if (!claimed) {
      const current = await store.getClaim(checkoutSessionId);
      if (current?.browserSub !== browserSub || current.entitlementId !== decision.entitlement.id) {
        return {
          ok: false,
          status: 409,
          code: "replay",
          error: "This checkout session has already been used.",
        };
      }
    }
  }
  return { ok: true, entitlement: decision.entitlement };
}

export async function revokeByPaymentIntent(
  deps: FulfillmentDeps,
  paymentIntentIdValue: string,
  reason: RevokeReason,
): Promise<Entitlement | null> {
  const existing = await deps.store.getByPaymentIntent(paymentIntentIdValue);
  if (!existing) return null;
  const { entitlement, changed } = revokeEntitlementRecord(existing, reason, deps.now?.());
  if (!changed) return entitlement;
  await deps.store.updateEntitlement(entitlement);
  await recordLedgerOnce(deps, entitlement, ledgerStatusForRevoke(reason));
  return entitlement;
}

export async function markCheckoutFailed(deps: FulfillmentDeps, source: CheckoutGrantSource): Promise<void> {
  await deps.store.markFailed(source.id);
  const paymentIntent = paymentIntentId(source.payment_intent);
  if (paymentIntent) {
    await revokeByPaymentIntent(deps, paymentIntent, "async_payment_failed");
  }
}

async function recordLedgerOnce(
  deps: FulfillmentDeps,
  entitlement: Entitlement,
  status: LedgerStatus,
): Promise<void> {
  await withLedgerLock(`${entitlement.id}:${status}`, async () => {
    const fresh = (await deps.store.getEntitlement(entitlement.id)) ?? entitlement;
    if (fresh.recordedLedger.includes(status)) return;
    const description =
      fresh.product === "meal"
        ? `Meal prep idea (${fresh.mealId ?? "unknown"})`
        : "Today's Session workout unlock";
    const sku = fresh.product === "meal" ? MEAL_PRODUCT : WORKOUT_PRODUCT;
    await deps.appendLedger(
      buildAccountancyRecord({
        order_id: fresh.orderId,
        items: [
          {
            sku,
            description,
            quantity: 1,
            unit_pence: fresh.amountPence,
          },
        ],
        total_pence: fresh.amountPence,
        processor_fee_pence: fresh.processorFeePence,
        payment_method: fresh.paymentMethod,
        stripe_payment_id: fresh.paymentIntentId,
        status,
        demo: fresh.demo,
      }),
    );
    const updated: Entitlement = {
      ...fresh,
      recordedLedger: [...fresh.recordedLedger, status],
    };
    await deps.store.updateEntitlement(updated);
    entitlement.recordedLedger = updated.recordedLedger;
  });
}

export async function activeEntitlementsForCookie(
  store: EntitlementStore,
  entitlementIds: readonly string[],
): Promise<Entitlement[]> {
  const records = await Promise.all(entitlementIds.map((id) => store.getEntitlement(id)));
  return records.filter((record): record is Entitlement => record !== null && record.status === "active");
}

export async function entitlementViewForIds(store: EntitlementStore, entitlementIds: readonly string[]) {
  const active = await activeEntitlementsForCookie(store, entitlementIds);
  return { active, ...viewFromEntitlements(active) };
}

export function paymentIntentFromStripe(value: string | Stripe.PaymentIntent | null | undefined): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}
