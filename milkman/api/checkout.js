// POST /api/checkout  { items: { apple_cider_brown_butter: n, sage_cranberry: n } }
// Creates a Stripe Checkout Session and returns its URL. Stripe's hosted checkout shows
// Apple Pay / Google Pay where the device supports them, plus card, and collects the
// delivery address, email and phone.

import { stripe } from '../lib/stripe.js';
import { DROP_AT, FLAVORS, MAX_EACH, SITE_URL } from '../lib/config.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (Date.now() < DROP_AT) return res.status(403).json({ error: 'Not yet — the flavors drop at 9 am.' });

  const items = req.body?.items || {};
  const line_items = [];
  for (const [key, flavor] of Object.entries(FLAVORS)) {
    const q = Number(items[key] || 0);
    if (!Number.isInteger(q) || q < 0 || q > MAX_EACH) return res.status(400).json({ error: 'Invalid quantity.' });
    if (q === 0) continue;
    const price = process.env[flavor.priceEnv];
    if (!price) {
      console.error(`[checkout] ${flavor.priceEnv} is not set`);
      return res.status(500).json({ error: 'Checkout is not set up yet.' });
    }
    line_items.push({ price, quantity: q });
  }
  if (!line_items.length) return res.status(400).json({ error: 'Pick at least one.' });

  try {
    const session = await stripe('POST', 'checkout/sessions', {
      mode: 'payment',
      line_items,
      shipping_address_collection: { allowed_countries: ['US'] },
      phone_number_collection: { enabled: true },
      billing_address_collection: 'auto',
      customer_creation: 'always',
      metadata: { source: 'milkman' },
      success_url: `${SITE_URL}/?order=success`,
      cancel_url: `${SITE_URL}/`,
    });
    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('[checkout]', err.message);
    return res.status(500).json({ error: 'Checkout is unavailable right now. Try again in a moment.' });
  }
}
