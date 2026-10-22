import { NextResponse } from "next/server";
import { getEntitlementStore } from "@/lib/entitlement-store";
import { entitlementViewForIds } from "@/lib/stripe-fulfillment";
import { entitlementJson, readUnlockSecret, readVerifiedUnlockCookie } from "@/lib/unlock-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let secret: string;
  try {
    secret = readUnlockSecret();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unlock cookie secret is not configured.";
    return NextResponse.json({ error: message, workoutUnlocked: false, mealIds: [] }, { status: 500 });
  }

  try {
    const claims = await readVerifiedUnlockCookie(secret);
    if (!claims) {
      return NextResponse.json(
        { workoutUnlocked: false, mealIds: [] },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    const view = await entitlementViewForIds(getEntitlementStore(), claims.entitlementIds);
    return entitlementJson(
      { workoutUnlocked: view.workoutUnlocked, mealIds: view.mealIds },
      200,
      {
        sub: claims.sub,
        entitlementIds: view.active.map((entitlement) => entitlement.id),
        secret,
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not read unlocks.";
    const sharedStore = message.includes("shared server-side store");
    return NextResponse.json(
      { error: sharedStore ? message : "Could not read unlocks.", workoutUnlocked: false, mealIds: [] },
      { status: sharedStore ? 503 : 500 },
    );
  }
}
