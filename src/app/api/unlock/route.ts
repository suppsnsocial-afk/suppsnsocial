import { NextResponse } from "next/server";
import { isKnownMealId } from "@/data/meal-preps";
import {
  getStripe,
  getUnlockConfig,
  isDemoUnlockEnabled,
  isPaidCheckoutSession,
  paidMealIdFromSession,
} from "@/lib/stripe-server";
import { unlockCookieHeader } from "@/lib/unlock";

type UnlockBody = {
  sessionId?: string;
  demo?: boolean;
  mealId?: string;
};

function workoutUnlockedResponse() {
  const response = NextResponse.json({ unlocked: true, product: "workout" });
  response.headers.append(
    "Set-Cookie",
    unlockCookieHeader(process.env.NODE_ENV === "production"),
  );
  return response;
}

export async function GET() {
  return NextResponse.json(getUnlockConfig());
}

export async function POST(request: Request) {
  let body: UnlockBody = {};
  try {
    body = (await request.json()) as UnlockBody;
  } catch {
    body = {};
  }

  if (body.demo) {
    if (!isDemoUnlockEnabled()) {
      return NextResponse.json(
        { error: "Demo unlock is only available in local development with DEMO_UNLOCK=true." },
        { status: 403 },
      );
    }

    const mealId = body.mealId?.trim();
    if (mealId) {
      if (!isKnownMealId(mealId)) {
        return NextResponse.json({ error: "That meal prep idea was not found." }, { status: 400 });
      }
      return NextResponse.json({ unlocked: true, product: "meal", mealId });
    }

    return workoutUnlockedResponse();
  }

  const sessionId = body.sessionId?.trim();
  if (!sessionId) {
    return NextResponse.json({ error: "Missing checkout session." }, { status: 400 });
  }

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    const mealId = paidMealIdFromSession(session);

    if (mealId) {
      if (!isKnownMealId(mealId)) {
        return NextResponse.json({ error: "That meal prep idea was not found." }, { status: 400 });
      }
      return NextResponse.json({ unlocked: true, product: "meal", mealId });
    }

    if (!isPaidCheckoutSession(session)) {
      return NextResponse.json({ error: "Payment is not complete yet." }, { status: 402 });
    }
    return workoutUnlockedResponse();
  } catch {
    return NextResponse.json({ error: "Could not verify that payment with Stripe." }, { status: 400 });
  }
}
