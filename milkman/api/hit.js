// POST /api/hit — called once per page view of the Milkman page (navigator.sendBeacon).
import crypto from 'node:crypto';
import { put } from '@vercel/blob';
import { clean, dayIn } from '../lib/visits.js';

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|headless|lighthouse|monitor/i;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).end();
  const ua = String(req.headers['user-agent'] || '');
  if (!ua || BOT.test(ua)) return res.status(204).end();

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};

  const now = Date.now();
  const day = dayIn(now);
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const visitor = crypto.createHash('sha256')
    .update(`${ip}|${ua}|${day}|${process.env.MILKMAN_ADMIN_KEY || ''}`)
    .digest('hex').slice(0, 12);
  const device = /iPad|Tablet/i.test(ua) ? 'tablet' : /Mobi|Android|iPhone/i.test(ua) ? 'mobile' : 'desktop';
  const country = clean(req.headers['x-vercel-ip-country'], 4);
  let city = '-';
  try { city = clean(decodeURIComponent(String(req.headers['x-vercel-ip-city'] || '')), 30); } catch {}
  const page = clean(body.page, 12);
  let ref = '-';
  try {
    const host = body.ref ? new URL(body.ref).hostname.replace(/^www\./, '') : '';
    ref = host && !host.endsWith('shaynebernier.com') ? clean(host, 40) : '-';
  } catch {}

  try {
    await put(`v/${day}/${now}~${visitor}~${device}~${country}~${city}~${page}~${ref}`, '1', {
      access: 'public',
      addRandomSuffix: true,
      contentType: 'text/plain',
    });
  } catch (err) {
    console.error('[hit]', err.message);
  }
  return res.status(204).end();
}
