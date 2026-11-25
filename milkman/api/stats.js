// POST /api/stats { key } — visit stats for the private list page.
import { isAdmin } from '../lib/auth.js';
import { list } from '@vercel/blob';
import { dayIn, parseVisit, TZ } from '../lib/visits.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!isAdmin(req)) return res.status(401).json({ error: 'Not logged in.' });

  try {
    const visits = [];
    let cursor;
    do {
      const page = await list({ prefix: 'v/', limit: 1000, cursor });
      for (const b of page.blobs) visits.push(parseVisit(b.pathname));
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);

    const now = Date.now();
    const today = dayIn(now);
    const uniq = arr => new Set(arr.map(v => v.visitor)).size;
    // Returning = the visitor's first view that day already carried a cookie from before.
    const returningCount = arr => {
      const first = new Map();
      for (const v of [...arr].sort((a, b) => a.ms - b.ms)) if (!first.has(v.visitor)) first.set(v.visitor, v);
      return [...first.values()].filter(v => v.ret === 'r').length;
    };
    const top = (arr, f, n = 8) => Object.entries(arr.reduce((m, v) => ((m[f(v)] = (m[f(v)] || 0) + 1), m), {}))
      .sort((a, b) => b[1] - a[1]).slice(0, n);

    const todays = visits.filter(v => dayIn(v.ms) === today);
    const byDay = top(visits, v => dayIn(v.ms), 60).sort((a, b) => b[0].localeCompare(a[0]));
    const hourOf = ms => Number(new Date(ms).toLocaleString('en-US', { timeZone: TZ, hour: 'numeric', hour12: false })) % 24;
    const byHour = Array.from({ length: 24 }, (_, h) => todays.filter(v => hourOf(v.ms) === h).length);

    return res.status(200).json({
      total: { views: visits.length, visitors: uniq(visits) },
      today: {
        views: todays.length,
        visitors: uniq(todays),
        returning: returningCount(todays),
      },
      lastHour: visits.filter(v => now - v.ms < 3600e3).length,
      byDay: byDay.map(([day, views]) => ({ day, views, visitors: uniq(visits.filter(v => dayIn(v.ms) === day)) })),
      byHourToday: byHour,
      devices: top(visits, v => v.device),
      cities: top(visits, v => (v.city !== '-' ? v.city : v.country), 10),
      referrers: top(visits.filter(v => v.ref !== '-'), v => v.ref),
      orderThanks: visits.filter(v => v.page === 'thanks').length,
    });
  } catch (err) {
    console.error('[stats]', err.message);
    return res.status(500).json({ error: 'Could not load stats.' });
  }
}
