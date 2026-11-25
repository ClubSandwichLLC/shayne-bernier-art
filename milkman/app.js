(() => {
  const root = document.querySelector('.milkman');
  const dropAt = Date.parse(root.dataset.dropAt);
  const before = root.querySelector('.before');
  const after = root.querySelector('.after');
  const thanks = root.querySelector('.thanks');
  const MAX_EACH = 8;
  const left = {}; // from /api/stock

  // No right-click / drag on the logo, same as the main site.
  document.addEventListener('contextmenu', e => { if (e.target.tagName === 'IMG') e.preventDefault(); });
  document.addEventListener('dragstart', e => { if (e.target.tagName === 'IMG') e.preventDefault(); });

  // Visit tracking (see api/hit.js): one beacon per page view, no cookies.
  const isThanks = new URLSearchParams(location.search).get('order') === 'success';
  try {
    navigator.sendBeacon('/api/hit', JSON.stringify({
      page: isThanks ? 'thanks' : Date.now() >= dropAt ? 'shop' : 'countdown',
      ref: document.referrer,
    }));
  } catch {}

  if (isThanks) {
    thanks.hidden = false;
    return;
  }

  /* ---------- Drop date line, built from data-drop-at so it can't drift ---------- */
  const when = new Date(dropAt);
  const tz = 'America/Chicago';
  const day = when.toLocaleDateString('en-US', { timeZone: tz, weekday: 'long', month: 'long', day: 'numeric' });
  const time = when.toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' }).replace(' AM', ' am').replace(' PM', ' pm');
  // Breaks only between "Flavors drop <day>" and "at <time> CT" (rule 10: non-breaking spaces, not markup).
  const nb = s => s.replace(/ /g, '\u00a0');
  root.querySelector('.drop-when').textContent = `${nb(`Flavors drop ${day}`)} ${nb(`at ${time} CT`)}`;

  /* ---------- Countdown ---------- */
  const pad = n => String(n).padStart(2, '0');
  const els = { h: root.querySelector('[data-u="h"]'), m: root.querySelector('[data-u="m"]'), s: root.querySelector('[data-u="s"]') };
  let timer;

  function tick() {
    const left = dropAt - Date.now();
    if (left <= 0) {
      clearInterval(timer);
      before.hidden = true;
      document.dispatchEvent(new Event('milkman:drop'));
      return;
    }
    const total = Math.floor(left / 1000);
    els.h.textContent = pad(Math.floor(total / 3600)); // hours keep counting past 24
    els.m.textContent = pad(Math.floor(total / 60) % 60);
    els.s.textContent = pad(total % 60);
    before.hidden = false;
  }
  tick();
  timer = setInterval(tick, 250);

  /* ---------- Text sign-up ---------- */
  const form = root.querySelector('.notify');
  const phoneInput = form.querySelector('#phone');
  const firstInput = form.querySelector('#first');
  const lastInput = form.querySelector('#last');
  const formShownAt = Date.now();
  const between = root.querySelector('.between');
  const formStatus = form.querySelector('.status');
  const formBtn = form.querySelector('button');

  /* Format the cell number as it's typed: 2105550100 → 210-555-0100.
     A dash appears only once the next group starts, so backspacing never gets stuck on one. */
  const digitsOf = v => {
    let d = v.replace(/\D/g, '');
    if (d.length > 10 && d[0] === '1') d = d.slice(1); // "+1 (210) 555-0100" from autofill
    return d.slice(0, 10);
  };
  const dashed = d => [d.slice(0, 3), d.slice(3, 6), d.slice(6)].filter(Boolean).join('-');
  phoneInput.addEventListener('beforeinput', e => {
    // Backspace right after a dash removes the digit before it instead.
    const { selectionStart: a, selectionEnd: b, value } = phoneInput;
    if (e.inputType === 'deleteContentBackward' && a === b && value[a - 1] === '-') {
      e.preventDefault();
      phoneInput.value = value.slice(0, a - 2) + value.slice(a);
      phoneInput.setSelectionRange(a - 2, a - 2);
      phoneInput.dispatchEvent(new Event('input'));
    }
  });
  phoneInput.addEventListener('input', () => {
    const before = phoneInput.value;
    const caret = phoneInput.selectionStart ?? before.length;
    const digitsBeforeCaret = before.slice(0, caret).replace(/\D/g, '').length;
    const next = dashed(digitsOf(before));
    if (next === before) return;
    phoneInput.value = next;
    // Put the caret back after the same number of digits.
    let pos = 0, seen = 0;
    while (pos < next.length && seen < Math.min(digitsBeforeCaret, 10)) { if (/\d/.test(next[pos])) seen++; pos++; }
    phoneInput.setSelectionRange(pos, pos);
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!firstInput.value.trim() || !lastInput.value.trim()) {
      formStatus.textContent = 'Add your first and last name.';
      return;
    }
    const digits = phoneInput.value.replace(/\D/g, '');
    if (!(digits.length === 10 || (digits.length === 11 && digits[0] === '1'))) {
      formStatus.textContent = 'Enter a 10-digit US mobile number.';
      return;
    }
    formBtn.disabled = true;
    formStatus.textContent = '';
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first: firstInput.value,
          last: lastInput.value,
          phone: phoneInput.value,
          website: form.querySelector('#website').value, // bot trap
          elapsed: Date.now() - formShownAt,             // bots submit instantly
        }),
      });
      if (res.status === 429 || res.status === 403) throw new Error('Too many tries. Wait a few minutes and try again.'); // firewall rate limit
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Something went wrong. Try again.');
      form.querySelectorAll('.name-row, .notify-row').forEach(r => r.hidden = true);
      formStatus.textContent = between.contains(form)
        ? "You're on the list. We'll text you when the next one drops."
        : "You're on the list. See you at 9.";
    } catch (err) {
      formStatus.textContent = err.message;
      formBtn.disabled = false;
    }
  });

  /* ---------- Flavors + checkout ---------- */
  const qty = {};
  const checkoutBtn = after.querySelector('.checkout');
  const checkoutStatus = after.querySelector('.checkout-status');

  const renders = [];
  after.querySelectorAll('.flavor').forEach(row => {
    const key = row.dataset.flavor;
    const num = row.querySelector('.qty-num');
    const qtyBox = row.querySelector('.qty');
    const soldOut = document.createElement('span');
    soldOut.className = 'sold-out';
    soldOut.textContent = 'Sold out';
    soldOut.hidden = true;
    qtyBox.after(soldOut);
    const [down, up] = row.querySelectorAll('.chev');
    qty[key] = 0;
    const cap = () => Math.min(MAX_EACH, left[key] ?? MAX_EACH);
    const render = () => {
      qty[key] = Math.min(qty[key], cap());
      const out = left[key] === 0;
      qtyBox.hidden = out;
      soldOut.hidden = !out;
      row.classList.toggle('is-sold-out', out);
      num.textContent = qty[key];
      down.disabled = qty[key] === 0;
      up.disabled = qty[key] >= cap();
      checkoutBtn.disabled = Object.values(qty).every(q => q === 0);
    };
    row.querySelectorAll('.chev').forEach(btn => btn.addEventListener('click', () => {
      qty[key] = Math.min(cap(), Math.max(0, qty[key] + Number(btn.dataset.step)));
      render();
    }));
    renders.push(render);
    render();
  });

  // After the drop: show the flavors, or — when every flavor is gone — the between-drops
  // message with the sign-up form moved into it.
  function showMode() {
    const keys = Object.keys(qty);
    const allGone = keys.length > 0 && keys.every(k => left[k] === 0);
    after.hidden = allGone;
    between.hidden = !allGone;
    if (allGone && !between.contains(form)) {
      between.append(form);
      form.querySelector('.notify-label').hidden = true;
    }
  }

  async function refreshStock() {
    try {
      const res = await fetch('/api/stock', { cache: 'no-store' });
      if (!res.ok) throw new Error();
      Object.assign(left, (await res.json()).left);
      renders.forEach(r => r());
    } catch {}
    showMode(); // on failure, falls back to the shop (left unknown = not sold out)
  }
  let stockTimer;
  const startStock = () => { if (!stockTimer) { refreshStock(); stockTimer = setInterval(refreshStock, 30000); } };
  // The countdown fires 'milkman:drop' at zero; if we loaded after the drop, start now.
  if (Date.now() >= dropAt) startStock();
  else document.addEventListener('milkman:drop', startStock, { once: true });

  checkoutBtn.addEventListener('click', async () => {
    checkoutBtn.disabled = true;
    checkoutStatus.textContent = '';
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: qty }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.sold_out) refreshStock();
      if (!res.ok || !data.url) throw new Error(data.error || 'Checkout is unavailable right now. Try again in a moment.');
      location.href = data.url; // Stripe Checkout: Apple Pay, Google Pay, card; collects address, email, phone
    } catch (err) {
      checkoutStatus.textContent = err.message;
      checkoutBtn.disabled = false;
    }
  });
})();
