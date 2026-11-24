// POST /api/orders — paid Milkman orders with what to deliver and where (login required).
// POST /api/orders { payment_intent, delivered: true|false } — mark an order delivered.
// "Delivered" is stored on the Stripe payment's metadata (milkman_delivered), so it is
// shared across devices and visible in the Stripe dashboard.

import { isAdmin } from '../lib/auth.js';
import { stripe } from '../lib/stripe.js';
import { DROP_AT, FLAVORS } from '../lib/config.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!isAdmin(req)) return res.status(401).json({ error: 'Not logged in.' });

  try {
    const { payment_intent, delivered } = req.body || {};
    if (payment_intent) {
      if (!/^pi_[A-Za-z0-9]+$/.test(payment_intent)) return res.status(400).json({ error: 'Bad order id.' });
      await stripe('POST', `payment_intents/${payment_intent}`, {
        metadata: { milkman_delivered: delivered ? new Date().toISOString() : '' },
      });
      return res.status(200).json({ ok: true });
    }

    const orders = [];
    const since = Math.floor(DROP_AT / 1000) - 24 * 3600;
    let starting_after;
    do {
      const page = await stripe('GET', 'checkout/sessions', {
        limit: 100,
        status: 'complete',
        created: { gte: since },
        starting_after,
        expand: ['data.payment_intent.latest_charge'],
      });
      for (const s of page.data) {
        if (s.metadata?.source !== 'milkman' || s.payment_status !== 'paid') continue;
        const items = await stripe('GET', `checkout/sessions/${s.id}/line_items`, { limit: 100 });
        const pi = s.payment_intent || {};
        const charge = pi.latest_charge || {};
        const ship = s.collected_information?.shipping_details || s.shipping_details || {};
        const cust = s.customer_details || {};
        orders.push({
          id: pi.id,
          number: (pi.id || s.id).slice(-6).toUpperCase(),
          created: s.created * 1000,
          name: ship.name || cust.name || '',
          email: cust.email || '',
          phone: cust.phone || '',
          address: ship.address || cust.address || null,
          total: s.amount_total,
          currency: s.currency,
          items: items.data.map(li => ({ key: flavorKey(li.price), name: li.description, quantity: li.quantity })),
          refunded: !!charge.refunded,
          partiallyRefunded: !charge.refunded && (charge.amount_refunded || 0) > 0,
          delivered: pi.metadata?.milkman_delivered || '',
        });
      }
      starting_after = page.has_more ? page.data[page.data.length - 1].id : undefined;
    } while (starting_after);

    orders.sort((a, b) => a.created - b.created); // oldest first = delivery order
    return res.status(200).json({ orders });
  } catch (err) {
    console.error('[orders]', err.message);
    return res.status(500).json({ error: 'Could not load orders.' });
  }
}

function flavorKey(price) {
  const product = typeof price?.product === 'string' ? price.product : price?.product?.id;
  return Object.keys(FLAVORS).find(k => FLAVORS[k].stripeId === product || FLAVORS[k].stripeId === price?.id) || null;
}
