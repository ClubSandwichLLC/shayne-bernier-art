// POST /api/signups  { key }
// Private: returns every text sign-up so the drop text can be sent by hand.
// Protected by MILKMAN_ADMIN_KEY (Vercel env var).

import crypto from 'node:crypto';
import { stripe } from '../lib/stripe.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const expected = process.env.MILKMAN_ADMIN_KEY || '';
  const given = String(req.body?.key || '');
  const ok = expected.length > 0 && given.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  if (!ok) return res.status(401).json({ error: 'Wrong password.' });

  try {
    const seen = new Map();
    let page;
    do {
      const r = await stripe('GET', 'customers/search', {
        query: `metadata['milkman_sms']:'yes'`,
        limit: 100,
        page,
      });
      for (const c of r.data) {
        if (c.phone && !seen.has(c.phone)) seen.set(c.phone, c.metadata?.sms_consent_at || '');
      }
      page = r.has_more ? r.next_page : undefined;
    } while (page);

    const signups = [...seen].map(([phone, at]) => ({ phone, at })).sort((a, b) => a.at.localeCompare(b.at));
    return res.status(200).json({ signups });
  } catch (err) {
    console.error('[signups]', err.message);
    return res.status(500).json({ error: 'Could not load the list.' });
  }
}
