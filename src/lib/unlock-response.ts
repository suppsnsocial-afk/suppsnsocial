import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { UNLOCK_COOKIE } from "./unlock";
import {
  getUnlockCookieSecret,
  issueUnlockCookie,
  unlockCookieOptions,
  verifyUnlockCookie,
  type UnlockCookieClaims,
} from "./unlock-cookie";

export function readUnlockSecret(): string {
  return getUnlockCookieSecret();
}

export async function readVerifiedUnlockCookie(secret: string): Promise<UnlockCookieClaims | null> {
  const jar = await cookies();
  return verifyUnlockCookie(jar.get(UNLOCK_COOKIE)?.value, secret);
}

export function attachUnlockCookie(
  response: NextResponse,
  input: { sub?: string; entitlementIds: readonly string[]; secret: string; now?: number },
): UnlockCookieClaims {
  const issued = issueUnlockCookie(input);
  response.cookies.set(UNLOCK_COOKIE, issued.token, unlockCookieOptions());
  response.headers.set("Cache-Control", "no-store");
  return issued.claims;
}

export function entitlementJson(
  body: unknown,
  status: number,
  cookie?: { sub?: string; entitlementIds: readonly string[]; secret: string },
): NextResponse {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "no-store");
  if (cookie) attachUnlockCookie(response, cookie);
  return response;
}
