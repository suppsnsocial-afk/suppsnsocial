import { newEntitlementId } from "./unlock-cookie";

export type EntitlementProduct = "workout" | "meal";
export type EntitlementStatus = "active" | "revoked";
export type RevokeReason = "refund" | "dispute" | "async_payment_failed";
export type LedgerStatus = "paid" | "refunded" | "disputed" | "failed";

export type Entitlement = {
  id: string;
  orderId: string;
  product: EntitlementProduct;
  mealId: string | null;
  checkoutSessionId: string;
  paymentIntentId: string;
  browserSub: string;
  status: EntitlementStatus;
  revokeReason: RevokeReason | null;
  amountPence: number;
  currency: "gbp";
  paymentMethod: string;
  processorFeePence: number;
  demo: boolean;
  createdAt: string;
  revokedAt: string | null;
  recordedLedger: LedgerStatus[];
};

export type EntitlementClaim = {
  entitlementId: string;
  browserSub: string;
  claimedAt: string;
};

export class EntitlementError extends Error {
  constructor(
    readonly code: "unpaid" | "replay" | "missing_payment_intent" | "failed" | "live" | "invalid",
    message: string,
  ) {
    super(message);
    this.name = "EntitlementError";
  }
}

export function isCheckoutPaymentPaid(paymentStatus: string | null | undefined): boolean {
  return paymentStatus === "paid";
}

export function assertPaymentPaid(paymentStatus: string | null | undefined): void {
  if (!isCheckoutPaymentPaid(paymentStatus)) {
    throw new EntitlementError(
      "unpaid",
      `Refusing to grant access when payment_status is '${paymentStatus ?? "missing"}'.`,
    );
  }
}

export type GrantEntitlementInput = {
  paymentStatus: string | null | undefined;
  checkoutSessionId: string;
  paymentIntentId: string | null;
  browserSub: string;
  orderId: string;
  product: EntitlementProduct;
  mealId: string | null;
  amountPence: number;
  paymentMethod: string;
  processorFeePence: number;
  demo?: boolean;
  now?: Date;
};

export function buildEntitlement(input: GrantEntitlementInput): Entitlement {
  assertPaymentPaid(input.paymentStatus);
  if (!input.paymentIntentId) {
    throw new EntitlementError("missing_payment_intent", "A paid checkout session has no payment_intent.");
  }
  const demo = input.demo === true;
  if (!demo && !input.checkoutSessionId.startsWith("cs_test_")) {
    throw new EntitlementError("live", "Refusing a checkout session that is not a Stripe test session.");
  }
  if (!demo && !input.paymentIntentId.startsWith("pi_test_")) {
    throw new EntitlementError("live", "Refusing a payment_intent that is not a Stripe test payment.");
  }
  const now = input.now ?? new Date();
  return {
    id: newEntitlementId(),
    orderId: input.orderId,
    product: input.product,
    mealId: input.product === "meal" ? input.mealId : null,
    checkoutSessionId: input.checkoutSessionId,
    paymentIntentId: input.paymentIntentId,
    browserSub: input.browserSub,
    status: "active",
    revokeReason: null,
    amountPence: input.amountPence,
    currency: "gbp",
    paymentMethod: input.paymentMethod,
    processorFeePence: input.processorFeePence,
    demo,
    createdAt: now.toISOString(),
    revokedAt: null,
    recordedLedger: [],
  };
}

export function revokeEntitlementRecord(
  entitlement: Entitlement,
  reason: RevokeReason,
  now = new Date(),
): { entitlement: Entitlement; changed: boolean } {
  if (entitlement.status === "revoked") {
    return { entitlement, changed: false };
  }
  return {
    changed: true,
    entitlement: {
      ...entitlement,
      status: "revoked",
      revokeReason: reason,
      revokedAt: now.toISOString(),
    },
  };
}

export type RedeemInput = {
  browserSub: string;
  entitlementIds: readonly string[];
};

export type RedeemResult =
  | { ok: true; entitlement: Entitlement }
  | { ok: false; reason: "replay" | "not_found" | "revoked" | "failed" | "mismatch" };

/**
 * A checkout session can be bound to a browser once.
 * The same browser may retry (refresh, lost response). Any other subject is a replay.
 */
export function decideRedeem(input: {
  entitlement: Entitlement | null;
  failed: boolean;
  claim: EntitlementClaim | null;
  browserSub: string;
}): RedeemResult | { ok: true; action: "claim"; entitlement: Entitlement } {
  if (input.failed) return { ok: false, reason: "failed" };
  if (!input.entitlement) return { ok: false, reason: "not_found" };
  if (input.entitlement.status !== "active") return { ok: false, reason: "revoked" };
  if (input.entitlement.browserSub !== input.browserSub) {
    return { ok: false, reason: "replay" };
  }
  if (input.claim) {
    if (input.claim.browserSub === input.browserSub && input.claim.entitlementId === input.entitlement.id) {
      return { ok: true, entitlement: input.entitlement };
    }
    return { ok: false, reason: "replay" };
  }
  return { ok: true, action: "claim", entitlement: input.entitlement };
}

export function viewFromEntitlements(entitlements: readonly Entitlement[]): {
  workoutUnlocked: boolean;
  mealIds: string[];
} {
  let workoutUnlocked = false;
  const mealIds: string[] = [];
  const seen = new Set<string>();
  for (const entitlement of entitlements) {
    if (entitlement.status !== "active") continue;
    if (entitlement.product === "workout") workoutUnlocked = true;
    if (entitlement.product === "meal" && entitlement.mealId && !seen.has(entitlement.mealId)) {
      seen.add(entitlement.mealId);
      mealIds.push(entitlement.mealId);
    }
  }
  return { workoutUnlocked, mealIds };
}

export function ledgerStatusForRevoke(reason: RevokeReason): LedgerStatus {
  if (reason === "refund") return "refunded";
  if (reason === "dispute") return "disputed";
  return "failed";
}
