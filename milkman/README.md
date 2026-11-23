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

Stripe → Customers → search `metadata['milkman_sms']:'yes'`. The 9 am text (Twilio) is not wired yet.
