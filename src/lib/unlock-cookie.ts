import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { UNLOCK_COOKIE, UNLOCK_COOKIE_MAX_AGE } from "./unlock";

const COOKIE_VERSION = "v1";
const MIN_SECRET_LENGTH = 32;

export type UnlockCookieClaims = {
  v: 1;
  /** Browser subject this cookie was issued for. */
  sub: string;
  /** Server entitlement ids this browser may present. */
  entitlementIds: string[];
  iat: number;
  exp: number;
};

export class UnlockCookieError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnlockCookieError";
  }
}

export function getUnlockCookieSecret(env: NodeJS.ProcessEnv = process.env): string {
  const secret = env.UNLOCK_COOKIE_SECRET?.trim() ?? "";
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new UnlockCookieError("UNLOCK_COOKIE_SECRET must be at least 32 characters.");
  }
  return secret;
}

export function newBrowserSub(): string {
  return `brw_${randomBytes(16).toString("base64url")}`;
}

export function newEntitlementId(): string {
  return `ent_${randomBytes(12).toString("base64url")}`;
}

export function signUnlockCookie(claims: UnlockCookieClaims, secret: string): string {
  if (claims.v !== 1) {
    throw new UnlockCookieError("Unsupported unlock cookie version.");
  }
  if (!isBrowserSub(claims.sub)) {
    throw new UnlockCookieError("Unlock cookie subject is invalid.");
  }
  if (!claims.entitlementIds.every(isEntitlementId)) {
    throw new UnlockCookieError("Unlock cookie contains an invalid entitlement id.");
  }
  const payload = Buffer.from(JSON.stringify(claims), "utf8").toString("base64url");
  const signed = `${COOKIE_VERSION}.${payload}`;
  const signature = createHmac("sha256", secret).update(signed).digest("base64url");
  return `${signed}.${signature}`;
}

export function verifyUnlockCookie(
  token: string | undefined | null,
  secret: string,
  now = Date.now(),
): UnlockCookieClaims | null {
  if (!token || !secret) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [version, payload, signature] = parts;
  if (version !== COOKIE_VERSION || !payload || !signature) return null;

  const signed = `${version}.${payload}`;
  const expected = createHmac("sha256", secret).update(signed).digest();
  const actual = decodeBase64Url(signature);
  if (!actual || actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return null;
  }

  let parsed: unknown;
  try {
    const json = Buffer.from(payload, "base64url").toString("utf8");
    parsed = JSON.parse(json) as unknown;
  } catch {
    return null;
  }
  if (!isClaims(parsed)) return null;
  if (parsed.exp <= now || parsed.iat > now + 60_000) return null;
  return parsed;
}

export function issueUnlockCookie(input: {
  sub?: string;
  entitlementIds: readonly string[];
  secret: string;
  now?: number;
}): { token: string; claims: UnlockCookieClaims } {
  const now = input.now ?? Date.now();
  const claims: UnlockCookieClaims = {
    v: 1,
    sub: input.sub && isBrowserSub(input.sub) ? input.sub : newBrowserSub(),
    entitlementIds: uniqueIds(input.entitlementIds),
    iat: now,
    exp: now + UNLOCK_COOKIE_MAX_AGE * 1000,
  };
  return { token: signUnlockCookie(claims, input.secret), claims };
}

export type UnlockCookieOptions = {
  httpOnly: true;
  secure: true;
  sameSite: "lax";
  path: "/";
  maxAge: number;
};

export function unlockCookieOptions(): UnlockCookieOptions {
  return {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: UNLOCK_COOKIE_MAX_AGE,
  };
}

export function serializeUnlockCookie(token: string): string {
  const options = unlockCookieOptions();
  return [
    `${UNLOCK_COOKIE}=${token}`,
    `Path=${options.path}`,
    `Max-Age=${options.maxAge}`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
  ].join("; ");
}

export function readCookieValue(cookieHeader: string | null | undefined, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    const key = part.slice(0, separator).trim();
    if (key !== name) continue;
    return part.slice(separator + 1).trim();
  }
  return undefined;
}

export function isEntitlementId(value: string): boolean {
  return /^ent_[A-Za-z0-9_-]{8,64}$/.test(value);
}

export function isBrowserSub(value: string): boolean {
  return /^brw_[A-Za-z0-9_-]{16,64}$/.test(value);
}

function uniqueIds(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const id of ids) {
    if (!isEntitlementId(id) || seen.has(id)) continue;
    seen.add(id);
    unique.push(id);
  }
  return unique;
}

function isClaims(value: unknown): value is UnlockCookieClaims {
  if (!value || typeof value !== "object") return false;
  const claims = value as Partial<UnlockCookieClaims>;
  return (
    claims.v === 1 &&
    typeof claims.sub === "string" &&
    isBrowserSub(claims.sub) &&
    Array.isArray(claims.entitlementIds) &&
    claims.entitlementIds.every((id) => typeof id === "string" && isEntitlementId(id)) &&
    typeof claims.iat === "number" &&
    typeof claims.exp === "number"
  );
}

function decodeBase64Url(value: string): Buffer | null {
  try {
    const buffer = Buffer.from(value, "base64url");
    if (buffer.length === 0 && value.length > 0) return null;
    return buffer;
  } catch {
    return null;
  }
}
