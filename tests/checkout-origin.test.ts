import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCheckoutSessionCreate, checkoutIdempotencyKey, integrationIdentifier } from "../src/lib/checkout-session";
import { appOrigin } from "../src/lib/stripe-server";

const SUB = "brw_checkoutbrowser01";

describe("app origin", () => {
  it("requires NEXT_PUBLIC_APP_URL in production and ignores request hosts", () => {
    assert.equal(appOrigin({ NODE_ENV: "production", NEXT_PUBLIC_APP_URL: "https://app.example/path" }), "https://app.example");
    assert.throws(() => appOrigin({ NODE_ENV: "production" }), /NEXT_PUBLIC_APP_URL is required in production/);
    assert.equal(appOrigin({ NODE_ENV: "development" }), "http://localhost:3000");
    assert.throws(() => appOrigin({ NODE_ENV: "development", NEXT_PUBLIC_APP_URL: "javascript:alert(1)" }), /http\(s\)/);
  });
});

describe("checkout idempotency", () => {
  it("passes an idempotency key and does not set payment_method_types", () => {
    const key = checkoutIdempotencyKey("meal_prep_attempt_01");
    assert.equal(key, "meal_prep_attempt_01");
    assert.match(checkoutIdempotencyKey("nope"), /^checkout_/);
    assert.match(integrationIdentifier("workout"), /^todays_session_workout_[a-z]{8}$/);
    assert.match(integrationIdentifier("meal"), /^todays_session_meal_[a-z]{8}$/);

    const { params, options } = buildCheckoutSessionCreate({
      product: "meal",
      mealId: "prep-chicken-rice-boxes",
      origin: "https://app.example",
      idempotencyKey: key,
      orderId: "ord_test",
      browserSub: SUB,
      integrationId: "todays_session_meal_abcdefgh",
    });
    assert.equal(options.idempotencyKey, key);
    assert.equal(Object.hasOwn(params, "payment_method_types"), false);
    assert.equal(params.integration_identifier, "todays_session_meal_abcdefgh");
    assert.equal(params.success_url, "https://app.example/?meal_session_id={CHECKOUT_SESSION_ID}");
    assert.equal(params.metadata?.browser_sub, SUB);
    assert.equal(params.line_items?.[0]?.price_data?.unit_amount, 50);
  });
});
