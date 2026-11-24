// Login for the private list page.
// A signed, HttpOnly cookie keeps you logged in for 90 days. The signature is keyed on
// MILKMAN_ADMIN_KEY, so changing that password logs every device out.
import crypto from 'node:crypto';

const COOKIE = 'milkman_admin';
const MAX_AGE = 90 * 24 * 3600;

const secret = () => process.env.MILKMAN_ADMIN_KEY || '';
const sign = exp => crypto.createHmac('sha256', secret()).update(`list:${exp}`).digest('base64url');
const same = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

export function passwordOk(given) {
  return secret().length > 0 && same(String(given || ''), secret());
}

function cookieOk(req) {
  const raw = String(req.headers.cookie || '').split(/;\s*/).find(c => c.startsWith(`${COOKIE}=`));
  if (!raw || !secret()) return false;
  const [exp, sig] = raw.slice(COOKIE.length + 1).split('.');
  return Number(exp) > Date.now() / 1000 && !!sig && same(sig, sign(exp));
}

// True for a valid cookie, or for the right password in the body.
export function isAdmin(req) {
  return cookieOk(req) || passwordOk(req.body?.key);
}

export function loginCookie() {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  return `${COOKIE}=${exp}.${sign(exp)}; Path=/api; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Strict`;
}

export function logoutCookie() {
  return `${COOKIE}=; Path=/api; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}
