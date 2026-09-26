export const UNLOCK_STORAGE_KEY = "todays-session:unlocked";
export const UNLOCK_COOKIE = "todays_session_unlock";
export const UNLOCK_VALUE = "paid";
export const UNLOCK_PRICE_PENCE = 100;
export const UNLOCK_PRICE_LABEL = "£1";
export const UNLOCK_CURRENCY = "gbp";

export const WORKOUT_PRODUCT = "todays-session-unlock";
export const MEAL_PRODUCT = "todays-session-meal";
export const MEAL_PRICE_PENCE = 50;
export const MEAL_PRICE_LABEL = "50p";

export const UNLOCK_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 10;

export type UnlockConfig = {
  stripeConfigured: boolean;
  demoUnlockAvailable: boolean;
  priceLabel: string;
  mealPriceLabel: string;
};

export function unlockCookieHeader(secure: boolean): string {
  const parts = [
    `${UNLOCK_COOKIE}=${UNLOCK_VALUE}`,
    "Path=/",
    `Max-Age=${UNLOCK_COOKIE_MAX_AGE}`,
    "SameSite=Lax",
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}
