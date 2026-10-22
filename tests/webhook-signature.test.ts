import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Stripe from "stripe";
import { processWebhookRequest, verifyStripeWebhook, WebhookSignatureError } from "../src/lib/stripe-webhook";

const SECRET = "whsec_test_webhook_secret_value";
const stripe = new Stripe("sk_test_signature_only");

function signedPayload(body: unknown): { payload: string; signature: string } {
  const payload = JSON.stringify(body);
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET });
  return { payload, signature };
}

describe("webhook signature", () => {
  it("rejects a missing signature and a bad signature without handling the event", async () => {
    let handled = 0;
    const missing = await processWebhookRequest({
      payload: "{}",
      signature: null,
      secret: SECRET,
      stripe,
      handle: async () => {
        handled += 1;
      },
    });
    assert.equal(missing.status, 400);
    assert.equal(handled, 0);

    const forged = await processWebhookRequest({
      payload: "{}",
      signature: "t=1,v1=deadbeef",
      secret: SECRET,
      stripe,
      handle: async () => {
        handled += 1;
      },
    });
    assert.equal(forged.status, 400);
    assert.equal(handled, 0);
    assert.throws(
      () => verifyStripeWebhook("{}", "t=1,v1=deadbeef", SECRET, stripe),
      WebhookSignatureError,
    );
  });

  it("rejects a body that was changed after the signature was computed", async () => {
    const { payload, signature } = signedPayload({
      id: "evt_test_raw",
      object: "event",
      type: "checkout.session.completed",
      livemode: false,
    });
    let handled = false;
    const result = await processWebhookRequest({
      payload: `${payload} `,
      signature,
      secret: SECRET,
      stripe,
      handle: async () => {
        handled = true;
      },
    });
    assert.equal(result.status, 400);
    assert.equal(handled, false);
  });

  it("accepts the raw body when the signature matches and rejects live mode", async () => {
    const testEvent = signedPayload({
      id: "evt_test_ok",
      object: "event",
      type: "charge.refunded",
      livemode: false,
      data: { object: { id: "ch_test", object: "charge" } },
    });
    let seen = "";
    const accepted = await processWebhookRequest({
      payload: testEvent.payload,
      signature: testEvent.signature,
      secret: SECRET,
      stripe,
      handle: async (event) => {
        seen = event.type;
      },
    });
    assert.equal(accepted.status, 200);
    assert.equal(accepted.body.received, true);
    assert.equal(seen, "charge.refunded");

    const liveEvent = signedPayload({
      id: "evt_live_rejected",
      object: "event",
      type: "charge.refunded",
      livemode: true,
    });
    let liveHandled = false;
    const rejected = await processWebhookRequest({
      payload: liveEvent.payload,
      signature: liveEvent.signature,
      secret: SECRET,
      stripe,
      handle: async () => {
        liveHandled = true;
      },
    });
    assert.equal(rejected.status, 400);
    assert.equal(liveHandled, false);
  });

  it("fails closed when the webhook secret is missing", async () => {
    const result = await processWebhookRequest({
      payload: "{}",
      signature: "t=1,v1=abc",
      secret: undefined,
      stripe,
      handle: async () => {
        throw new Error("must not run");
      },
    });
    assert.equal(result.status, 500);
  });
});
