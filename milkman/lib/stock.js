// Stock for the drop, counted live from Stripe — no database.
//   sold = paid Milkman checkouts since the drop (fully refunded ones don't count)
//   held = Milkman checkouts opened in the last 5 minutes. Stripe's own expiry can't be
//          shorter than 30 minutes, so older open checkouts are cancelled here.
//   left = STOCK_EACH - sold - held

import { stripe } from './stripe.js';
import { DROP_AT, FLAVORS, HOLD_SECONDS, STOCK_EACH } from './config.js';

export async function stockLeft({ excludeSession } = {}) {
  const used = Object.fromEntries(Object.keys(FLAVORS).map(k => [k, 0]));
  const since = Math.floor(DROP_AT / 1000) - 24 * 3600; // include any pre-drop tests on drop day

  let starting_after;
  do {
    const page = await stripe('GET', 'checkout/sessions', {
      limit: 100,
      created: { gte: since },
      starting_after,
      expand: ['data.payment_intent.latest_charge'],
    });
    for (const s of page.data) {
      if (s.metadata?.source !== 'milkman' || s.id === excludeSession) continue;
      if (s.status === 'open' && Date.now() / 1000 - s.created > HOLD_SECONDS) {
        // Hold is over: cancel it so the customer can't pay for stock we've released.
        await stripe('POST', `checkout/sessions/${s.id}/expire`).catch(() => {});
        continue;
      }
      const counts =
        (s.status === 'open') ||
        (s.status === 'complete' && s.payment_status === 'paid' && !s.payment_intent?.latest_charge?.refunded);
      if (!counts) continue;
      const items = await stripe('GET', `checkout/sessions/${s.id}/line_items`, { limit: 100 });
      for (const li of items.data) {
        const key = flavorFor(li.price);
        if (key) used[key] += li.quantity;
      }
    }
    starting_after = page.has_more ? page.data[page.data.length - 1].id : undefined;
  } while (starting_after);

  return Object.fromEntries(Object.keys(FLAVORS).map(k => [k, Math.max(0, STOCK_EACH - used[k])]));
}

function flavorFor(price) {
  const product = typeof price?.product === 'string' ? price.product : price?.product?.id;
  for (const [key, f] of Object.entries(FLAVORS)) {
    if (f.stripeId === product || f.stripeId === price?.id) return key;
  }
  return null;
}
