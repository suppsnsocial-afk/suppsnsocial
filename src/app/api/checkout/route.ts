import { NextResponse } from "next/server";
import { isKnownMealId } from "@/data/meal-preps";
import { appOrigin, getStripe, isStripeConfigured } from "@/lib/stripe-server";
import {
  MEAL_PRICE_PENCE,
  MEAL_PRODUCT,
  UNLOCK_CURRENCY,
  UNLOCK_PRICE_PENCE,
  WORKOUT_PRODUCT,
} from "@/lib/unlock";

type CheckoutBody = {
  product?: string;
  mealId?: string;
};

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe is not configured. Add STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY." },
      { status: 503 },
    );
  }

  let body: CheckoutBody = {};
  try {
    body = (await request.json()) as CheckoutBody;
  } catch {
    body = {};
  }

  const origin = appOrigin(request);
  const stripe = getStripe();
  const wantsMeal = body.product === "meal";

  if (wantsMeal) {
    const mealId = body.mealId?.trim() ?? "";
    if (!isKnownMealId(mealId)) {
      return NextResponse.json({ error: "That meal prep idea was not found." }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      currency: UNLOCK_CURRENCY,
      metadata: { product: MEAL_PRODUCT, mealId },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: UNLOCK_CURRENCY,
            unit_amount: MEAL_PRICE_PENCE,
            product_data: {
              name: "Meal prep idea",
              description: "One-time 50p unlock for this meal prep idea and its method.",
            },
          },
        },
      ],
      success_url: `${origin}/?meal_session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?meal_checkout=cancelled`,
    });

    if (!session.url) {
      return NextResponse.json({ error: "Stripe did not return a checkout URL." }, { status: 502 });
    }

    return NextResponse.json({ url: session.url });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    currency: UNLOCK_CURRENCY,
    metadata: { product: WORKOUT_PRODUCT },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: UNLOCK_CURRENCY,
          unit_amount: UNLOCK_PRICE_PENCE,
          product_data: {
            name: "Today's Session workout unlock",
            description: "One-time access to workout ideas for Supps n Social customers.",
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
