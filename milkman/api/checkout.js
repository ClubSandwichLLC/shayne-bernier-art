// POST /api/checkout  { items: { apple_cider_brown_butter: n, sage_cranberry: n } }
// Creates a Stripe Checkout Session and returns its URL. Stripe's hosted checkout shows
// Apple Pay / Google Pay where the device supports them, plus card, and collects the
// delivery address, email and phone.

import { stripe } from '../lib/stripe.js';
import { DROP_AT, FLAVORS, MAX_EACH, SITE_URL } from '../lib/config.js';
import { stockLeft } from '../lib/stock.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (Date.now() < DROP_AT) return res.status(403).json({ error: 'Not yet — the flavors drop at 9 am.' });

  const items = req.body?.items || {};
  const line_items = [];
  for (const [key, flavor] of Object.entries(FLAVORS)) {
    const q = Number(items[key] || 0);
    if (!Number.isInteger(q) || q < 0 || q > MAX_EACH) return res.status(400).json({ error: 'Invalid quantity.' });
    if (q === 0) continue;
    line_items.push({ key, id: flavor.stripeId, quantity: q });
  }
  if (!line_items.length) return res.status(400).json({ error: 'Pick at least one.' });

  try {
    const short = tooMany(line_items, await stockLeft());
    if (short) return res.status(409).json({ error: short, sold_out: true });

    const keys = line_items.map(i => i.key);
    for (const item of line_items) {
      item.price = await resolvePrice(item.id);
      delete item.id;
      delete item.key;
    }
    const session = await stripe('POST', 'checkout/sessions', {
      mode: 'payment',
      line_items,
      // Card only. In Checkout this still shows Apple Pay and Google Pay, and drops
      // Klarna, Amazon Pay, bank payments and the other dashboard-enabled methods.
      payment_method_types: ['card'],
      custom_text: {
        shipping_address: { message: 'Milkman delivers in San Antonio only. Shipping is not available at this time.' },
      },
      shipping_address_collection: { allowed_countries: ['US'] },
      phone_number_collection: { enabled: true },
      billing_address_collection: 'auto',
      customer_creation: 'always',
      metadata: { source: 'milkman' },
      // Stripe's minimum. The real 5-minute hold is enforced in lib/stock.js.
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60 + 60,
      success_url: `${SITE_URL}/?order=success`,
      cancel_url: `${SITE_URL}/`,
    });

    // Two people can pass the first check at the same moment. Recount with this session
    // left out; if the others already used the stock, cancel this one.
    const after = await stockLeft({ excludeSession: session.id });
    const lateShort = tooMany(line_items.map((li, i) => ({ key: keys[i], quantity: li.quantity })), after);
    if (lateShort) {
      await stripe('POST', `checkout/sessions/${session.id}/expire`).catch(() => {});
      return res.status(409).json({ error: lateShort, sold_out: true });
    }

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('[checkout]', err.message);
    return res.status(500).json({ error: 'Checkout is unavailable right now. Try again in a moment.' });
  }
}

// A product ID resolves to that product's default price; a price ID is used as is.
const priceCache = new Map();
async function resolvePrice(id) {
  if (id.startsWith('price_')) return id;
  if (priceCache.has(id)) return priceCache.get(id);
  const product = await stripe('GET', `products/${id}`);
  const price = typeof product.default_price === 'string' ? product.default_price : product.default_price?.id;
  if (!product.active || !price) throw new Error(`Stripe product ${id} is inactive or has no default price`);
  priceCache.set(id, price);
  return price;
}

function tooMany(items, left) {
  for (const { key, quantity } of items) {
    if (quantity > left[key]) {
      const name = FLAVORS[key].name;
      return left[key] === 0 ? `${name} just sold out.` : `Only ${left[key]} ${name} left.`;
    }
  }
  return null;
}
