// Shared server config for the Milkman drop.

// Must match data-drop-at in index.html. 2026-11-24 09:00 Central (CST) = 15:00 UTC.
export const DROP_AT = Date.parse(process.env.MILKMAN_DROP_AT || '2026-11-24T15:00:00Z');

export const MAX_EACH = 12;

// Each flavor maps to a Stripe Price you create in the Dashboard (Products → Add product).
export const FLAVORS = {
  apple_cider_brown_butter: { name: 'Apple Cider Brown Butter', priceEnv: 'STRIPE_PRICE_APPLE_CIDER_BROWN_BUTTER' },
  sage_cranberry: { name: 'Sage Cranberry', priceEnv: 'STRIPE_PRICE_SAGE_CRANBERRY' },
};

// The exact opt-in wording shown on the page; stored with every sign-up as the consent record.
export const SMS_CONSENT_TEXT =
  'Text me when it drops. One text when the flavors drop. Msg & data rates may apply. Reply STOP to opt out.';

export const SITE_URL = process.env.MILKMAN_SITE_URL || 'https://milkman.shaynebernier.com';
