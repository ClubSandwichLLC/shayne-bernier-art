// Shared server config for the Milkman drop.

// Must match data-drop-at in index.html. 2026-11-24 09:00 Central (CST) = 15:00 UTC.
export const DROP_AT = Date.parse(process.env.MILKMAN_DROP_AT || '2026-11-24T15:00:00Z');

export const MAX_EACH = 12;

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
  'Text me when it drops. One text when the flavors drop. Msg & data rates may apply. Reply STOP to opt out.';

export const SITE_URL = process.env.MILKMAN_SITE_URL || 'https://milkman.shaynebernier.com';
