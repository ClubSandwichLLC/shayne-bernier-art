// Shared server config for the Milkman drop.

// Must match data-drop-at in index.html. 2026-11-24 09:00 Central (CST) = 15:00 UTC.
export const DROP_AT = Date.parse(process.env.MILKMAN_DROP_AT || '2026-11-24T15:00:00Z');

// Total available per flavor for this drop, and the most one order can take.
export const STOCK_EACH = Number(process.env.MILKMAN_STOCK_EACH || 8);
export const MAX_EACH = 8;

// Manual sold-out switch, regardless of stock: MILKMAN_SOLD_OUT = "all", or flavor keys
// separated by commas (e.g. "sage_cranberry"). Empty = normal stock counting.
export const SOLD_OUT = new Set(
  String(process.env.MILKMAN_SOLD_OUT || '').split(',').map(s => s.trim()).filter(Boolean)
);
export const isSoldOut = key => SOLD_OUT.has('all') || SOLD_OUT.has(key);

// How long a checkout holds stock before it's cancelled.
export const HOLD_SECONDS = 5 * 60;

// Each flavor is a Stripe product; checkout charges the product's default price.
// An env var can override with a different prod_… or a specific price_… ID.
export const FLAVORS = {
  apple_cider_brown_butter: {
    name: 'Apple Cider Brown Butter',
    stripeId: process.env.STRIPE_PRICE_APPLE_CIDER_BROWN_BUTTER || 'prod_VgN09I6aGk1lLI',
  },
  sage_cranberry: {
    name: 'Sage Cranberry',
    stripeId: process.env.STRIPE_PRICE_SAGE_CRANBERRY || 'prod_VgN2ysuOg6wnM1',
  },
};

// The exact opt-in wording shown on the page; stored with every sign-up as the consent record.
export const SMS_CONSENT_TEXT =
  'Sign up for Milkman drop texts. No spam, and your number is safe with us. Pinkie promise.';

export const SITE_URL = process.env.MILKMAN_SITE_URL || 'https://milkman.shaynebernier.com';
