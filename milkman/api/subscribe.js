// POST /api/subscribe  { phone }
// Saves a text-notification sign-up as a Stripe Customer tagged milkman_sms=yes,
// with the consent wording, time and source stored on it. No separate database needed;
// the 9 am send reads them back with Stripe's customer search.

import { stripe, toE164US } from '../lib/stripe.js';
import { SMS_CONSENT_TEXT, SITE_URL } from '../lib/config.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const phone = toE164US(req.body?.phone);
  if (!phone) return res.status(400).json({ error: 'Enter a 10-digit US mobile number.' });

  try {
    const existing = await stripe('GET', 'customers/search', {
      query: `phone:'${phone}' AND metadata['milkman_sms']:'yes'`,
      limit: 1,
    });
    if (existing.data.length) return res.status(200).json({ ok: true });

    await stripe('POST', 'customers', {
      phone,
      description: 'Milkman drop — text sign-up',
      metadata: {
        milkman_sms: 'yes',
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
