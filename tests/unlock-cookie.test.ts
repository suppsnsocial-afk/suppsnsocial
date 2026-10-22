import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { UNLOCK_COOKIE } from "../src/lib/unlock";
import {
  issueUnlockCookie,
  serializeUnlockCookie,
  signUnlockCookie,
  unlockCookieOptions,
  verifyUnlockCookie,
} from "../src/lib/unlock-cookie";

const SECRET = "test-unlock-cookie-secret-value-32";
const NOW = 1_700_000_000_000;
const SUB = "brw_abc1234567890abc";
const ENTITLEMENT_ID = "ent_workoutunlock01";

function claims() {
  return issueUnlockCookie({
    sub: SUB,
    entitlementIds: [ENTITLEMENT_ID],
    secret: SECRET,
    now: NOW,
  });
}

describe("HMAC unlock cookie", () => {
  it("signs and verifies a payload that references entitlement ids", () => {
    const issued = claims();
    const verified = verifyUnlockCookie(issued.token, SECRET, NOW);
    assert.ok(verified);
    assert.deepEqual(verified.entitlementIds, [ENTITLEMENT_ID]);
    assert.equal(verified.sub, SUB);
    assert.equal(verified.v, 1);
  });

  it("rejects a tampered payload, a wrong secret, and an expired cookie", () => {
    const issued = claims();
    const [version, payload, signature] = issued.token.split(".");
    const tampered = `${version}.${payload}x.${signature}`;
    assert.equal(verifyUnlockCookie(tampered, SECRET, NOW), null);
    assert.equal(verifyUnlockCookie(issued.token, `${SECRET}-other`, NOW), null);
    assert.equal(verifyUnlockCookie(issued.token, SECRET, issued.claims.exp + 1), null);
  });

  it("rejects the legacy unsigned paid value", () => {
    assert.equal(verifyUnlockCookie("paid", SECRET, NOW), null);
    assert.equal(verifyUnlockCookie(`${UNLOCK_COOKIE}=paid`, SECRET, NOW), null);
  });

  it("sets HttpOnly, Secure, and SameSite=Lax", () => {
    const issued = claims();
    const header = serializeUnlockCookie(issued.token);
    assert.match(header, new RegExp(`^${UNLOCK_COOKIE}=`));
    assert.match(header, /HttpOnly/);
    assert.match(header, /Secure/);
    assert.match(header, /SameSite=Lax/);
    assert.doesNotMatch(header, /=paid(?:;|$)/);
    const options = unlockCookieOptions();
    assert.equal(options.httpOnly, true);
    assert.equal(options.secure, true);
    assert.equal(options.sameSite, "lax");
  });

  it("refuses to sign a cookie whose entitlement id was not issued by the server", () => {
    assert.throws(() =>
      signUnlockCookie(
        {
          v: 1,
          sub: SUB,
          entitlementIds: ["paid"],
          iat: NOW,
          exp: NOW + 1000,
        },
        SECRET,
      ),
    );
  });
});
