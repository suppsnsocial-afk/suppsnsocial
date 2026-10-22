import { NextResponse } from "next/server";
import { isKnownMealId } from "@/data/meal-preps";
import { appendAccountancyRecord } from "@/lib/accountancy";
import { getEntitlementStore } from "@/lib/entitlement-store";
import { isDemoUnlockEnabled, getStripe, getUnlockConfig, isStripeConfigured } from "@/lib/stripe-server";
import {
  entitlementViewForIds,
  grantDemoAccess,
  grantFromCheckoutSession,
  redeemCheckoutSession,
} from "@/lib/stripe-fulfillment";
import { lookupProcessorFeePence } from "@/lib/stripe-webhook";
import { entitlementJson, readUnlockSecret, readVerifiedUnlockCookie } from "@/lib/unlock-response";
import { newBrowserSub } from "@/lib/unlock-cookie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type UnlockBody = {
  sessionId?: string;
  demo?: boolean;
  mealId?: string;
};

function fulfillmentDeps() {
  return {
    store: getEntitlementStore(),
    isKnownMealId,
    appendLedger: (record: Parameters<typeof appendAccountancyRecord>[0]) => appendAccountancyRecord(record),
    processorFeePence: lookupProcessorFeePence,
  };
}

export async function GET() {
  return NextResponse.json(getUnlockConfig(), {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  let body: UnlockBody = {};
  try {
    body = (await request.json()) as UnlockBody;
  } catch {
    body = {};
  }

  let secret: string;
  try {
    secret = readUnlockSecret();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unlock cookie secret is not configured.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  if (body.demo) {
    if (!isDemoUnlockEnabled()) {
      return NextResponse.json(
        { error: "Demo unlock is only available in local development with DEMO_UNLOCK=true." },
        { status: 403 },
      );
    }
    const mealId = body.mealId?.trim();
    if (mealId && !isKnownMealId(mealId)) {
      return NextResponse.json({ error: "That meal prep idea was not found." }, { status: 400 });
    }
    try {
      const claims = await readVerifiedUnlockCookie(secret);
      const browserSub = claims?.sub ?? newBrowserSub();
      const deps = fulfillmentDeps();
      const granted = await grantDemoAccess(deps, {
        browserSub,
        product: mealId ? "meal" : "workout",
        mealId: mealId ?? null,
      });
      const view = await entitlementViewForIds(deps.store, [
        ...(claims?.entitlementIds ?? []),
        granted.id,
      ]);
      return entitlementJson(
        {
          unlocked: true,
          product: mealId ? "meal" : "workout",
          mealId: mealId ?? null,
          workoutUnlocked: view.workoutUnlocked,
          mealIds: view.mealIds,
        },
        200,
        { sub: browserSub, entitlementIds: view.active.map((entitlement) => entitlement.id), secret },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Demo unlock is not available.";
      const sharedStore = message.includes("shared server-side store");
      return NextResponse.json(
        { error: sharedStore ? message : "Demo unlock is not available." },
        { status: sharedStore ? 503 : 500 },
      );
    }
  }

  const sessionId = body.sessionId?.trim() ?? "";
  if (!sessionId) {
    return NextResponse.json({ error: "Missing checkout session." }, { status: 400 });
  }
  if (!sessionId.startsWith("cs_test_")) {
    return NextResponse.json({ error: "Only test-mode Checkout sessions can be confirmed." }, { status: 400 });
  }
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }

  try {
    const claims = await readVerifiedUnlockCookie(secret);
    if (!claims) {
      return NextResponse.json(
        { error: "This browser has no unlock cookie. Start checkout again from the app." },
        { status: 401 },
      );
    }
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    if (session.livemode) {
      return NextResponse.json({ error: "Live mode payments are not accepted." }, { status: 400 });
    }
    const deps = fulfillmentDeps();
    const granted = await grantFromCheckoutSession(session, deps);
    if (!granted.ok) {
      return NextResponse.json({ error: granted.error }, { status: granted.status });
    }
    const redeemed = await redeemCheckoutSession(deps.store, session.id, claims.sub);
    if (!redeemed.ok) {
      return NextResponse.json({ error: redeemed.error }, { status: redeemed.status });
    }
    const view = await entitlementViewForIds(deps.store, [...claims.entitlementIds, redeemed.entitlement.id]);
    return entitlementJson(
      {
        unlocked: true,
        product: redeemed.entitlement.product,
        mealId: redeemed.entitlement.mealId,
        workoutUnlocked: view.workoutUnlocked,
        mealIds: view.mealIds,
      },
      200,
      { sub: claims.sub, entitlementIds: view.active.map((entitlement) => entitlement.id), secret },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not verify that payment with Stripe.";
    if (message.includes("shared server-side store")) {
      return NextResponse.json({ error: message }, { status: 503 });
    }
    return NextResponse.json({ error: "Could not verify that payment with Stripe." }, { status: 400 });
  }
}
