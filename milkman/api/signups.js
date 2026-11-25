// POST /api/signups                         → every text sign-up (for sending drop texts by hand)
// POST /api/signups { phone, first, last }  → set the name on that sign-up
// Requires the login cookie (or the password in the body).

import { isAdmin } from '../lib/auth.js';
import { stripe, toE164US } from '../lib/stripe.js';

const cleanName = s => String(s || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 40);

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!isAdmin(req)) return res.status(401).json({ error: 'Not logged in.' });

  try {
    if (req.body?.phone) {
      const phone = toE164US(req.body.phone);
      const first = cleanName(req.body.first), last = cleanName(req.body.last);
      if (!phone || !first || !last) return res.status(400).json({ error: 'Need a phone, first and last name.' });
      const found = await stripe('GET', 'customers/search', {
        query: `phone:'${phone}' AND metadata['milkman_sms']:'yes'`, limit: 10,
      });
      if (!found.data.length) return res.status(404).json({ error: 'No sign-up with that number.' });
      for (const c of found.data) {
        await stripe('POST', `customers/${c.id}`, {
          name: `${first} ${last}`, metadata: { first_name: first, last_name: last },
        });
      }
      return res.status(200).json({ ok: true, updated: found.data.length, name: `${first} ${last}` });
    }

    const seen = new Map();
    let page;
    do {
      const r = await stripe('GET', 'customers/search', {
        query: `metadata['milkman_sms']:'yes'`,
        limit: 100,
        page,
      });
      for (const c of r.data) {
        if (c.phone && !seen.has(c.phone)) seen.set(c.phone, { at: c.metadata?.sms_consent_at || '', name: c.name || '' });
      }
      page = r.has_more ? r.next_page : undefined;
    } while (page);

    const signups = [...seen].map(([phone, v]) => ({ phone, ...v })).sort((a, b) => a.at.localeCompare(b.at));
    return res.status(200).json({ signups });
  } catch (err) {
    console.error('[signups]', err.message);
    return res.status(500).json({ error: 'Could not load the list.' });
  }
}
