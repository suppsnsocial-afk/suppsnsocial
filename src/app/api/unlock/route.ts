import { NextResponse } from "next/server";
import { getStripe, getUnlockConfig, isDemoUnlockEnabled, isPaidCheckoutSession } from "@/lib/stripe-server";
import { unlockCookieHeader } from "@/lib/unlock";

function unlockedResponse() {
  const response = NextResponse.json({ unlocked: true });
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
  let body: { sessionId?: string; demo?: boolean } = {};
  try {
    body = (await request.json()) as { sessionId?: string; demo?: boolean };
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
    return unlockedResponse();
  }

  const sessionId = body.sessionId?.trim();
  if (!sessionId) {
    return NextResponse.json({ error: "Missing checkout session." }, { status: 400 });
  }

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    if (!isPaidCheckoutSession(session)) {
      return NextResponse.json({ error: "Payment is not complete yet." }, { status: 402 });
    }
    return unlockedResponse();
  } catch {
    return NextResponse.json({ error: "Could not verify that payment with Stripe." }, { status: 400 });
  }
}
