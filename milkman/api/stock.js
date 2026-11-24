// GET /api/stock → { left: { apple_cider_brown_butter: n, sage_cranberry: n } }
import { stockLeft } from '../lib/stock.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    return res.status(200).json({ left: await stockLeft() });
  } catch (err) {
    console.error('[stock]', err.message);
    return res.status(500).json({ error: 'Could not load stock.' });
  }
}
