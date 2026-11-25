# Milkman — milkman.shaynebernier.com

One page. Before the drop: logo, countdown to **Tue Nov 24, 2026, 9:00 am Central**, and a text-me sign-up.
At 9:00 the page flips on its own to the two flavors (Apple Cider Brown Butter, Sage Cranberry), each with a
quantity selector, and a Checkout that goes to Stripe (Apple Pay / Google Pay / card; collects delivery
address, email and phone).

- `index.html`, `style.css`, `app.js` — the page (IBM Plex Mono + Schoolbell, same as shaynebernier.com)
- `api/subscribe.js` — saves a phone sign-up as a Stripe Customer tagged `milkman_sms=yes` with the consent wording, time and IP
- `api/checkout.js` — creates the Stripe Checkout Session; refuses orders before the drop time
- `logo.png` — the Milkman logo, recolored dark blue (#1f3a6b) on a transparent background

## Go live (Vercel)

1. Vercel → Add New Project → import `shayne-bernier-art`, set **Root Directory** to `milkman`. No build command.
2. Environment variables (see `.env.example`):
   - `STRIPE_SECRET_KEY` — live secret key
   - The flavors are already wired to Stripe products `prod_VgN09I6aGk1lLI` (Apple Cider Brown Butter) and
     `prod_VgN2ysuOg6wnM1` (Sage Cranberry); checkout charges each product's **default price**.
3. Vercel → Domains → add `milkman.shaynebernier.com`, then at your DNS provider add
   `CNAME milkman → cname.vercel-dns.com`.
4. Stripe → Settings → Payment methods: make sure Apple Pay and Google Pay are on (they are by default).

## Changing the drop time

Change `data-drop-at` in `index.html` **and** `MILKMAN_DROP_AT` (env var or `lib/config.js`) together. Times are UTC.

## Sign-up list

`/list.html` (password = Vercel env var `MILKMAN_ADMIN_KEY`) lists every text sign-up with a one-tap
"Text" link that opens a message with the drop text filled in. Until a Twilio number is registered
(toll-free verification or A2P 10DLC), drop texts are sent by hand from this page.

## Spam protection

- **Vercel Firewall** (project → Firewall) rate-limits per IP, 10-minute windows:
  `/api/subscribe` 5, `/api/login` 10, `/api/checkout` 20. Over the limit → blocked at the edge.
- **Sign-up form**: hidden trap field + minimum time on screen. Caught bots get a normal
  "you're on the list" reply and nothing is saved.

## Between drops

When every flavor's stock is 0 (or `MILKMAN_SOLD_OUT=all`), the page shows *Sold Out* and
the sign-up form instead of the flavors and Checkout.
