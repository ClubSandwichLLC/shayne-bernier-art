// POST /api/login { key } → sets the 90-day cookie.   POST /api/login { logout: true } → clears it.
import { loginCookie, logoutCookie, passwordOk } from '../lib/auth.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (req.body?.logout) {
    res.setHeader('Set-Cookie', logoutCookie());
    return res.status(200).json({ ok: true });
  }
  if (!passwordOk(req.body?.key)) return res.status(401).json({ error: 'Wrong password.' });
  res.setHeader('Set-Cookie', loginCookie());
  return res.status(200).json({ ok: true });
}
