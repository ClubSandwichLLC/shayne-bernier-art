// POST /api/subscribe  { first, last, phone, website, elapsed }
// Saves a text-notification sign-up as a Stripe Customer tagged milkman_sms=yes, with the
// consent wording, time and source stored on it. The 9 am send / list page reads them back.
//
// Spam protection, in layers:
//   1. Vercel Firewall rate-limits POST /api/subscribe per IP (see README).
//   2. `website` is a hidden trap field: people never see it, bots fill it in.
//   3. `elapsed` is how long the form was on screen; people take seconds, bots milliseconds.
// Caught submissions get the same success reply as real ones, so bots learn nothing.

import { stripe, toE164US } from '../lib/stripe.js';
import { SMS_CONSENT_TEXT, SITE_URL } from '../lib/config.js';

const MIN_HUMAN_MS = 1500;
const cleanName = s => String(s || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 40);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const body = req.body || {};

  const looksLikeBot =
    String(body.website || '').trim() !== '' ||
    !(Number(body.elapsed) >= MIN_HUMAN_MS) ||
    !req.headers['user-agent'];
  if (looksLikeBot) {
    console.warn('[subscribe] dropped bot-like submission');
    return res.status(200).json({ ok: true });
  }

  const first = cleanName(body.first);
  const last = cleanName(body.last);
  if (!first || !last) return res.status(400).json({ error: 'Add your first and last name.' });
  const phone = toE164US(body.phone);
  if (!phone) return res.status(400).json({ error: 'Enter a 10-digit US mobile number.' });

  try {
    const existing = await stripe('GET', 'customers/search', {
      query: `phone:'${phone}' AND metadata['milkman_sms']:'yes'`,
      limit: 1,
    });
    if (existing.data.length) {
      await stripe('POST', `customers/${existing.data[0].id}`, {
        name: `${first} ${last}`,
        metadata: { first_name: first, last_name: last },
      });
      return res.status(200).json({ ok: true });
    }

    await stripe('POST', 'customers', {
      phone,
      name: `${first} ${last}`,
      description: 'Milkman drop — text sign-up',
      metadata: {
        milkman_sms: 'yes',
        first_name: first,
        last_name: last,
        sms_consent_text: SMS_CONSENT_TEXT,
        sms_consent_at: new Date().toISOString(),
        sms_consent_source: SITE_URL,
        sms_consent_ip: String(req.headers['x-forwarded-for'] || '').split(',')[0].trim().slice(0, 64),
      },
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[subscribe]', err.message);
    return res.status(500).json({ error: 'Something went wrong. Try again.' });
  }
}
