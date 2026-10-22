import { NextResponse } from "next/server";
import { isKnownMealId } from "@/data/meal-preps";
import {
  buildCheckoutSessionCreate,
  checkoutIdempotencyKey,
  integrationIdentifier,
  newOrderId,
} from "@/lib/checkout-session";
import { getEntitlementStore } from "@/lib/entitlement-store";
import { entitlementViewForIds } from "@/lib/stripe-fulfillment";
import { appOrigin, getStripe, isStripeConfigured } from "@/lib/stripe-server";
import { entitlementJson, readUnlockSecret, readVerifiedUnlockCookie } from "@/lib/unlock-response";
import { newBrowserSub } from "@/lib/unlock-cookie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CheckoutBody = {
  product?: string;
  mealId?: string;
  idempotencyKey?: string;
};

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      {
        error:
          "Stripe is not configured. Add test keys for STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.",
      },
      { status: 503 },
    );
  }

  let body: CheckoutBody = {};
  try {
    body = (await request.json()) as CheckoutBody;
  } catch {
    body = {};
  }

  let origin: string;
  let secret: string;
  try {
    origin = appOrigin();
    secret = readUnlockSecret();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Checkout is not configured.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const wantsMeal = body.product === "meal";
  const mealId = body.mealId?.trim() ?? "";
  if (wantsMeal && !isKnownMealId(mealId)) {
    return NextResponse.json({ error: "That meal prep idea was not found." }, { status: 400 });
  }

  let browserSub: string;
  let entitlementIds: string[] = [];
  try {
    const claims = await readVerifiedUnlockCookie(secret);
    browserSub = claims?.sub ?? newBrowserSub();
    const view = await entitlementViewForIds(getEntitlementStore(), claims?.entitlementIds ?? []);
    entitlementIds = view.active.map((entitlement) => entitlement.id);
    if (!wantsMeal && view.workoutUnlocked) {
      return NextResponse.json({ error: "Workouts are already unlocked on this browser." }, { status: 409 });
    }
    if (wantsMeal && view.mealIds.includes(mealId)) {
      return NextResponse.json({ error: "This meal prep is already unlocked on this browser." }, { status: 409 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not read the current unlocks.";
    const sharedStore = message.includes("shared server-side store");
    return NextResponse.json({ error: sharedStore ? message : "Could not read the current unlocks." }, {
      status: sharedStore ? 503 : 500,
    });
  }

  try {
    const { params, options } = buildCheckoutSessionCreate({
      product: wantsMeal ? "meal" : "workout",
      mealId: wantsMeal ? mealId : undefined,
      origin,
      idempotencyKey: checkoutIdempotencyKey(body.idempotencyKey),
      orderId: newOrderId(),
      browserSub,
      integrationId: integrationIdentifier(wantsMeal ? "meal" : "workout"),
    });
    const session = await getStripe().checkout.sessions.create(params, options);
    if (!session.url || session.livemode) {
      return NextResponse.json({ error: "Stripe did not return a test checkout URL." }, { status: 502 });
    }
    return entitlementJson({ url: session.url }, 200, {
      sub: browserSub,
      entitlementIds,
      secret,
    });
  } catch (error) {
    console.error("Checkout session was not created.");
    const message = error instanceof Error ? error.message : "";
    if (message.includes("not a test key")) {
      return NextResponse.json({ error: message }, { status: 503 });
    }
    return NextResponse.json({ error: "Could not start Stripe Checkout." }, { status: 502 });
  }
}
