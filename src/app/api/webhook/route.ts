import { NextResponse } from "next/server";
import { isKnownMealId } from "@/data/meal-preps";
import { appendAccountancyRecord } from "@/lib/accountancy";
import { getEntitlementStore } from "@/lib/entitlement-store";
import { handleStripeEvent, lookupProcessorFeePence, processWebhookRequest } from "@/lib/stripe-webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  try {
    const result = await processWebhookRequest({
      payload,
      signature,
      secret,
      handle: (event) =>
        handleStripeEvent(event, {
          store: getEntitlementStore(),
          isKnownMealId,
          appendLedger: (record) => appendAccountancyRecord(record),
          processorFeePence: lookupProcessorFeePence,
        }),
    });
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error("Webhook handler failed.", error instanceof Error ? error.name : "Error");
    return NextResponse.json({ error: "Webhook handler failed." }, { status: 500 });
  }
}
