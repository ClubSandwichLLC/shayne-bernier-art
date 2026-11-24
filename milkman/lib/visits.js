// Visit records live in the Vercel Blob store "milkman-visits" (BLOB_READ_WRITE_TOKEN).
// Each visit is one empty file whose *name* holds the data, so stats come from a
// listing alone — no file reads:
//   v/<day>/<ms>~<visitor>~<device>~<country>~<city>~<page>~<referrer>
// <visitor> is a one-way hash of IP + browser + day: it counts unique visitors per day
// without storing the IP or anything that identifies a person across days.

export const TZ = 'America/Chicago';

export function dayIn(ms, tz = TZ) {
  return new Date(ms).toLocaleDateString('en-CA', { timeZone: tz }); // YYYY-MM-DD
}

export const clean = (s, max = 40) =>
  String(s || '').toLowerCase().replace(/[^a-z0-9.-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, max) || '-';

export function parseVisit(pathname) {
  const name = pathname.split('/').pop().replace(/-[A-Za-z0-9]{20,}$/, ''); // drop random suffix if any
  const [ms, visitor, device, country, city, page, ref] = name.split('~');
  return { ms: Number(ms), visitor, device, country, city, page, ref };
}
