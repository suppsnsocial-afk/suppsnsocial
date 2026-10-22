export const UNLOCK_COOKIE = "todays_session_unlock";
export const UNLOCK_PRICE_PENCE = 100;
export const UNLOCK_PRICE_LABEL = "£1";
export const UNLOCK_CURRENCY = "gbp";

export const WORKOUT_PRODUCT = "todays-session-unlock";
export const MEAL_PRODUCT = "todays-session-meal";
export const MEAL_PRICE_PENCE = 50;
export const MEAL_PRICE_LABEL = "50p";

export const ACCOUNTANCY_APP = "todays-session";

/** Ten years. The signed payload also carries its own expiry. */
export const UNLOCK_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 10;

export type UnlockProduct = "workout" | "meal";

export type UnlockConfig = {
  stripeConfigured: boolean;
  demoUnlockAvailable: boolean;
  priceLabel: string;
  mealPriceLabel: string;
};
