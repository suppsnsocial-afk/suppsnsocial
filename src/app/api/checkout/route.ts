import { NextResponse } from "next/server";
import { appOrigin, getStripe, isStripeConfigured } from "@/lib/stripe-server";
import { UNLOCK_CURRENCY, UNLOCK_PRICE_PENCE } from "@/lib/unlock";

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe is not configured. Add STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY." },
      { status: 503 },
    );
  }

  const origin = appOrigin(request);
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    currency: UNLOCK_CURRENCY,
    metadata: { product: "todays-session-unlock" },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: UNLOCK_CURRENCY,
          unit_amount: UNLOCK_PRICE_PENCE,
          product_data: {
            name: "Today's Session unlock",
            description: "One-time access to workout and meal prep ideas for Supps n Social customers.",
          },
        },
      },
    ],
    success_url: `${origin}/?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/?checkout=cancelled`,
  });

  if (!session.url) {
    return NextResponse.json({ error: "Stripe did not return a checkout URL." }, { status: 502 });
  }

  return NextResponse.json({ url: session.url });
}
