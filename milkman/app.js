(() => {
  const root = document.querySelector('.milkman');
  const dropAt = Date.parse(root.dataset.dropAt);
  const before = root.querySelector('.before');
  const after = root.querySelector('.after');
  const thanks = root.querySelector('.thanks');
  const MAX_EACH = 12;

  // No right-click / drag on the logo, same as the main site.
  document.addEventListener('contextmenu', e => { if (e.target.tagName === 'IMG') e.preventDefault(); });
  document.addEventListener('dragstart', e => { if (e.target.tagName === 'IMG') e.preventDefault(); });

  if (new URLSearchParams(location.search).get('order') === 'success') {
    thanks.hidden = false;
    return;
  }

  /* ---------- Drop date line, built from data-drop-at so it can't drift ---------- */
  const when = new Date(dropAt);
  const tz = 'America/Chicago';
  const day = when.toLocaleDateString('en-US', { timeZone: tz, weekday: 'long', month: 'long', day: 'numeric' });
  const time = when.toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' }).replace(' AM', ' am').replace(' PM', ' pm');
  root.querySelector('.drop-when').innerHTML = `Flavors drop ${day} <span class="nowrap">at ${time} CT</span>`;

  /* ---------- Countdown ---------- */
  const pad = n => String(n).padStart(2, '0');
  const els = { h: root.querySelector('[data-u="h"]'), m: root.querySelector('[data-u="m"]'), s: root.querySelector('[data-u="s"]') };
  let timer;

  function tick() {
    const left = dropAt - Date.now();
    if (left <= 0) {
      clearInterval(timer);
      before.hidden = true;
      after.hidden = false;
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
  const phoneInput = form.querySelector('input');
  const formStatus = form.querySelector('.status');
  const formBtn = form.querySelector('button');

  form.addEventListener('submit', async e => {
    e.preventDefault();
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
        body: JSON.stringify({ phone: phoneInput.value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Something went wrong. Try again.');
      form.querySelector('.notify-row').hidden = true;
      formStatus.textContent = "You're on the list. See you at 9.";
    } catch (err) {
      formStatus.textContent = err.message;
      formBtn.disabled = false;
    }
  });

  /* ---------- Flavors + checkout ---------- */
  const qty = {};
  const checkoutBtn = after.querySelector('.checkout');
  const checkoutStatus = after.querySelector('.checkout-status');

  after.querySelectorAll('.flavor').forEach(row => {
    const key = row.dataset.flavor;
    const num = row.querySelector('.qty-num');
    const [down, up] = row.querySelectorAll('.chev');
    qty[key] = 0;
    const render = () => {
      num.textContent = qty[key];
      down.disabled = qty[key] === 0;
      up.disabled = qty[key] === MAX_EACH;
      checkoutBtn.disabled = Object.values(qty).every(q => q === 0);
    };
    row.querySelectorAll('.chev').forEach(btn => btn.addEventListener('click', () => {
      qty[key] = Math.min(MAX_EACH, Math.max(0, qty[key] + Number(btn.dataset.step)));
      render();
    }));
    render();
  });

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
      if (!res.ok || !data.url) throw new Error(data.error || 'Checkout is unavailable right now. Try again in a moment.');
      location.href = data.url; // Stripe Checkout: Apple Pay, Google Pay, card; collects address, email, phone
    } catch (err) {
      checkoutStatus.textContent = err.message;
      checkoutBtn.disabled = false;
    }
  });
})();
