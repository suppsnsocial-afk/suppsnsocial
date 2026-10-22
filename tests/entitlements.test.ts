import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import type Stripe from "stripe";
import { appendAccountancyRecord, buildAccountancyRecord } from "../src/lib/accountancy";
import {
  createEntitlementStoreFromEnv,
  FileEntitlementStore,
  KvEntitlementStore,
  MemoryEntitlementStore,
} from "../src/lib/entitlement-store";
import { buildEntitlement, isCheckoutPaymentPaid } from "../src/lib/entitlements";
import {
  grantFromCheckoutSession,
  redeemCheckoutSession,
  type CheckoutGrantSource,
  type FulfillmentDeps,
} from "../src/lib/stripe-fulfillment";
import { isCheckoutPaid } from "../src/lib/stripe-server";
import { handleStripeEvent } from "../src/lib/stripe-webhook";

const SUB = "brw_browserowner0001";
const OTHER = "brw_someoneelse0002";
const MEAL = "prep-chicken-rice-boxes";

function deps(store: MemoryEntitlementStore, ledger: string[] = []): FulfillmentDeps {
  return {
    store,
    isKnownMealId: (id) => id === MEAL,
    appendLedger: async (record) => {
      ledger.push(JSON.stringify(record));
    },
    processorFeePence: async () => 20,
  };
}

function workoutSession(overrides: Partial<CheckoutGrantSource> = {}): CheckoutGrantSource {
  return {
    id: "cs_test_workout",
    livemode: false,
    payment_status: "paid",
    currency: "gbp",
    amount_total: 100,
    payment_intent: "pi_test_workout",
    payment_method_types: ["card"],
    metadata: {
      product: "todays-session-unlock",
      order_id: "ord_workout",
      browser_sub: SUB,
    },
    ...overrides,
  };
}

function mealSession(): CheckoutGrantSource {
  return {
    id: "cs_test_meal",
    livemode: false,
    payment_status: "paid",
    currency: "gbp",
    amount_total: 50,
    payment_intent: "pi_test_meal",
    payment_method_types: ["card"],
    metadata: {
      product: "todays-session-meal",
      mealId: MEAL,
      order_id: "ord_meal",
      browser_sub: SUB,
    },
  };
}

describe("payment_status", () => {
  it("grants only when payment_status is paid, not when the session is merely complete", async () => {
    assert.equal(isCheckoutPaymentPaid("paid"), true);
    assert.equal(isCheckoutPaymentPaid("unpaid"), false);
    assert.equal(isCheckoutPaymentPaid("no_payment_required"), false);
    const completeButUnpaid = { payment_status: "unpaid", status: "complete" };
    assert.equal(isCheckoutPaid(completeButUnpaid), false);

    const store = new MemoryEntitlementStore();
    const unpaid = await grantFromCheckoutSession(
      workoutSession({ payment_status: "unpaid" }),
      deps(store),
    );
    assert.equal(unpaid.ok, false);
    if (unpaid.ok) return;
    assert.equal(unpaid.code, "unpaid");
    assert.equal(unpaid.status, 402);
    assert.equal(await store.getByCheckoutSession("cs_test_workout"), null);
  });
});

describe("grant and revoke", () => {
  it("stores workout and meal entitlements against the session and payment_intent", async () => {
    const store = new MemoryEntitlementStore();
    const ledger: string[] = [];
    const workout = await grantFromCheckoutSession(workoutSession(), deps(store, ledger));
    const meal = await grantFromCheckoutSession(mealSession(), deps(store, ledger));
    assert.equal(workout.ok, true);
    assert.equal(meal.ok, true);
    if (!workout.ok || !meal.ok) return;

    assert.equal((await store.getByCheckoutSession("cs_test_workout"))?.id, workout.entitlement.id);
    assert.equal((await store.getByPaymentIntent("pi_test_meal"))?.mealId, MEAL);
    assert.equal(ledger.length, 2);
    const paid = JSON.parse(ledger[0]) as { v: string; vat_pence: number; stripe_payment_id: string; status: string };
    assert.equal(paid.v, "1.1");
    assert.equal(paid.vat_pence, 0);
    assert.equal(paid.stripe_payment_id, "pi_test_workout");
    assert.equal(paid.status, "paid");

    const again = await grantFromCheckoutSession(workoutSession(), deps(store, ledger));
    assert.equal(again.ok, true);
    if (!again.ok) return;
    assert.equal(again.created, false);
    assert.equal(again.entitlement.id, workout.entitlement.id);
    assert.equal(ledger.length, 2);
  });

  it("revokes on refund and dispute", async () => {
    const store = new MemoryEntitlementStore();
    const ledger: string[] = [];
    const wired = deps(store, ledger);
    await grantFromCheckoutSession(workoutSession(), wired);
    await grantFromCheckoutSession(mealSession(), wired);

    await handleStripeEvent(stripeEvent("charge.refunded", { id: "ch_test", object: "charge", payment_intent: "pi_test_workout" }), wired);
    const refunded = await store.getByPaymentIntent("pi_test_workout");
    assert.equal(refunded?.status, "revoked");
    assert.equal(refunded?.revokeReason, "refund");

    await handleStripeEvent(
      stripeEvent("charge.dispute.created", {
        id: "dp_test",
        object: "dispute",
        payment_intent: "pi_test_meal",
      }),
      wired,
    );
    const disputed = await store.getByPaymentIntent("pi_test_meal");
    assert.equal(disputed?.status, "revoked");
    assert.equal(disputed?.revokeReason, "dispute");

    const statuses = ledger.map((line) => (JSON.parse(line) as { status: string }).status);
    assert.deepEqual(statuses, ["paid", "paid", "refunded", "disputed"]);
  });

  it("does not grant checkout.session.completed while unpaid, and grants async_payment_succeeded", async () => {
    const store = new MemoryEntitlementStore();
    const wired = deps(store);
    await handleStripeEvent(
      stripeEvent("checkout.session.completed", {
        ...workoutSession({ payment_status: "unpaid" }),
        object: "checkout.session",
        status: "complete",
      }),
      wired,
    );
    assert.equal(await store.getByCheckoutSession("cs_test_workout"), null);

    await handleStripeEvent(
      stripeEvent("checkout.session.async_payment_succeeded", {
        ...workoutSession(),
        object: "checkout.session",
      }),
      wired,
    );
    assert.equal((await store.getByCheckoutSession("cs_test_workout"))?.status, "active");
  });

  it("marks async_payment_failed so a later grant is refused", async () => {
    const store = new MemoryEntitlementStore();
    const wired = deps(store);
    await handleStripeEvent(
      stripeEvent("checkout.session.async_payment_failed", {
        ...workoutSession({ payment_status: "unpaid" }),
        object: "checkout.session",
      }),
      wired,
    );
    const granted = await grantFromCheckoutSession(workoutSession(), wired);
    assert.equal(granted.ok, false);
    if (granted.ok) return;
    assert.equal(granted.code, "failed");
  });
});

describe("replay rejection", () => {
  it("binds a checkout session to one browser and rejects a second subject", async () => {
    const store = new MemoryEntitlementStore();
    const granted = await grantFromCheckoutSession(workoutSession(), deps(store));
    assert.equal(granted.ok, true);
    if (!granted.ok) return;

    const first = await redeemCheckoutSession(store, "cs_test_workout", SUB);
    assert.equal(first.ok, true);

    const replay = await redeemCheckoutSession(store, "cs_test_workout", OTHER);
    assert.equal(replay.ok, false);
    if (replay.ok) return;
    assert.equal(replay.code, "replay");
    assert.equal(replay.status, 409);

    const sameBrowser = await redeemCheckoutSession(store, "cs_test_workout", SUB);
    assert.equal(sameBrowser.ok, true);
    if (!sameBrowser.ok) return;
    assert.equal(sameBrowser.entitlement.id, granted.entitlement.id);
  });
});

describe("entitlement store", () => {
  it("reloads entitlements from the file store", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "todays-session-"));
    try {
      const file = path.join(directory, "entitlements.json");
      const store = new FileEntitlementStore(file);
      const entitlement = buildEntitlement({
        paymentStatus: "paid",
        checkoutSessionId: "cs_test_file",
        paymentIntentId: "pi_test_file",
        browserSub: SUB,
        orderId: "ord_file",
        product: "workout",
        mealId: null,
        amountPence: 100,
        paymentMethod: "card",
        processorFeePence: 0,
      });
      await store.insertEntitlement(entitlement);
      const reloaded = new FileEntitlementStore(file);
      assert.equal((await reloaded.getByPaymentIntent("pi_test_file"))?.id, entitlement.id);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("uses Upstash REST commands for the KV adapter and requires a shared store in production", async () => {
    const saved = new Map<string, string>();
    const fetchImpl: typeof fetch = async (_url, init) => {
      const args = JSON.parse(String(init?.body)) as string[];
      const [command, key, value] = args;
      if (command === "GET") {
        return Response.json({ result: saved.has(key) ? saved.get(key) : null });
      }
      if (command === "SET" && args.includes("NX") && saved.has(key)) {
        return Response.json({ result: null });
      }
      if (command === "SET") {
        saved.set(key, value);
        return Response.json({ result: "OK" });
      }
      return Response.json({ error: "unknown" }, { status: 400 });
    };
    const store = new KvEntitlementStore({
      url: "https://example.upstash.io",
      token: "test-token",
      fetchImpl,
    });
    const entitlement = buildEntitlement({
      paymentStatus: "paid",
      checkoutSessionId: "cs_test_kv",
      paymentIntentId: "pi_test_kv",
      browserSub: SUB,
      orderId: "ord_kv",
      product: "meal",
      mealId: MEAL,
      amountPence: 50,
      paymentMethod: "card",
      processorFeePence: 4,
    });
    await store.insertEntitlement(entitlement);
    assert.equal((await store.getByCheckoutSession("cs_test_kv"))?.mealId, MEAL);
    assert.equal(await store.tryClaim("cs_test_kv", { entitlementId: entitlement.id, browserSub: SUB, claimedAt: "now" }), true);
    assert.equal(await store.tryClaim("cs_test_kv", { entitlementId: entitlement.id, browserSub: OTHER, claimedAt: "later" }), false);

    assert.throws(
      () => createEntitlementStoreFromEnv({ NODE_ENV: "production" }),
      /shared server-side store is required in production/,
    );
    const devStore = createEntitlementStoreFromEnv({
      NODE_ENV: "development",
      ENTITLEMENT_STORE_PATH: path.join(tmpdir(), "unused-entitlements.json"),
    });
    assert.ok(devStore instanceof FileEntitlementStore);
  });
});

describe("accountancy ledger", () => {
  it("appends v1.1 records and does not rewrite earlier lines", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "todays-session-ledger-"));
    try {
      const file = path.join(directory, "accountancy.jsonl");
      const paid = buildAccountancyRecord({
        order_id: "ord_1",
        items: [{ sku: "todays-session-unlock", description: "Workout", quantity: 1, unit_pence: 100 }],
        total_pence: 100,
        processor_fee_pence: 20,
        payment_method: "card",
        stripe_payment_id: "pi_test_ledger",
        status: "paid",
        demo: false,
      });
      await appendAccountancyRecord(paid, file);
      await appendAccountancyRecord({ ...paid, status: "refunded" }, file);
      const lines = (await readFile(file, "utf8")).trim().split("\n");
      assert.equal(lines.length, 2);
      assert.equal(JSON.parse(lines[0]).status, "paid");
      assert.equal(JSON.parse(lines[0]).vat_pence, 0);
      assert.equal(JSON.parse(lines[0]).v, "1.1");
      assert.equal(JSON.parse(lines[1]).status, "refunded");
      assert.equal(JSON.parse(lines[1]).stripe_payment_id, "pi_test_ledger");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});

function stripeEvent(type: string, object: object): Stripe.Event {
  return {
    id: `evt_${type}`,
    object: "event",
    api_version: "2026-08-26.dahlia",
    created: 1_700_000_000,
    livemode: false,
    pending_webhooks: 1,
    request: null,
    type,
    data: { object },
  } as Stripe.Event;
}
