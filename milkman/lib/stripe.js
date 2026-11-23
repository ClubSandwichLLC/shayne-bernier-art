// Minimal Stripe REST client — no SDK, no dependencies.

export async function stripe(method, path, params) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');

  let url = `https://api.stripe.com/v1/${path}`;
  const init = { method, headers: { Authorization: `Bearer ${key}` } };
  if (params) {
    const body = encode(params);
    if (method === 'GET') url += `?${body}`;
    else {
      init.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      init.body = body;
    }
  }

  const res = await fetch(url, init);
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data?.error?.message || `Stripe ${res.status}`);
    err.stripe = data?.error;
    throw err;
  }
  return data;
}

// Stripe's bracketed form encoding: { a: { b: [ {c: 1} ] } } → a[b][0][c]=1
function encode(obj, prefix, out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === 'object') encode(v, key, out);
    else out.append(key, String(v));
  }
  return out;
}

export function toE164US(raw) {
  const d = String(raw || '').replace(/\D/g, '');
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d[0] === '1') return `+${d}`;
  return null;
}
