document.addEventListener('DOMContentLoaded', () => {

  /* --- Disable right-click & drag on images --- */
  document.addEventListener('contextmenu', (e) => {
    if (e.target.tagName === 'IMG') e.preventDefault();
  });
  document.addEventListener('dragstart', (e) => {
    if (e.target.tagName === 'IMG') e.preventDefault();
  });

  /* --- Hamburger / Dropdown Nav --- */
  const hamburger = document.querySelector('.hamburger');
  const dropdown = document.querySelector('.nav-dropdown');

  if (hamburger && dropdown) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      dropdown.classList.toggle('open');
    });

    dropdown.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('open');
        dropdown.classList.remove('open');
      });
    });
  }

  /* --- Mood Board Layout --- */
  const board = document.querySelector('.mood-board');
  if (board) {
    layoutMoodBoard();
    window.addEventListener('resize', debounce(layoutMoodBoard, 200));
  }

  /* --- Lightbox --- */
  const lightbox = document.querySelector('.lightbox');
  const lightboxImg = lightbox?.querySelector('img');

  document.querySelectorAll('.work-item').forEach(item => {
    item.addEventListener('click', () => {
      const src = item.querySelector('img').src;
      if (lightboxImg && lightbox) {
        lightboxImg.src = src;
        lightbox.classList.add('open');
      }
    });
  });

  if (lightbox) {
    lightbox.addEventListener('click', () => {
      lightbox.classList.remove('open');
    });
  }

  /* --- Contact Form --- */
  const form = document.querySelector('.contact-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      const action = form.getAttribute('action');
      if (!action || action === '#') {
        e.preventDefault();
        alert('Form endpoint not configured yet. Update the form action with your Formspree URL.');
      }
    });
  }
});

/* ============================================
   Mood Board — scattered layout engine
   ============================================ */
function layoutMoodBoard() {
  const board = document.querySelector('.mood-board');
  if (!board) return;

  const items = Array.from(board.querySelectorAll('.work-item'));
  if (items.length === 0) return;

  const scrollArea = board.closest('.frame-scroll-area');
  const boardWidth = scrollArea ? scrollArea.offsetWidth : board.parentElement.offsetWidth;

  const isMobile = boardWidth < 500;

  // Seeded pseudo-random for consistent layout across reloads
  let seed = 42;
  function rand() {
    seed = (seed * 16807 + 0) % 2147483647;
    return (seed - 1) / 2147483646;
  }

  const cols = isMobile ? 2 : 3;
  const gutter = isMobile ? 20 : 35;
  const colWidth = (boardWidth - (cols - 1) * gutter) / cols;
  const minItemWidth = colWidth * 0.55;
  const maxItemWidth = colWidth * 0.92;
  const minVGap = isMobile ? 20 : 30;
  const maxVGap = isMobile ? 60 : 120;

  // Track bottom of each column
  const colBottoms = new Array(cols).fill(0);

  items.forEach((item) => {
    const w = minItemWidth + rand() * (maxItemWidth - minItemWidth);

    const ratio = item.dataset.ratio ? parseFloat(item.dataset.ratio) : 1;
    const h = w / ratio;

    // Pick the shortest column
    const shortestCol = colBottoms.indexOf(Math.min(...colBottoms));

    // Center within column lane with slight random offset
    const colLeft = shortestCol * (colWidth + gutter);
    const centerOffset = (colWidth - w) / 2;
    const jitter = (rand() - 0.5) * (colWidth - w) * 0.6;
    const x = colLeft + centerOffset + jitter;

    // Random vertical gap — big range for organic spacing
    const gap = minVGap + rand() * (maxVGap - minVGap);
    const y = colBottoms[shortestCol] + gap;

    item.style.width = w + 'px';
    item.style.left = x + 'px';
    item.style.top = y + 'px';
    item.style.transform = 'none';
    item.style.zIndex = 1;

    colBottoms[shortestCol] = y + h;
  });

  board.style.height = (Math.max(...colBottoms) + 40) + 'px';
}

function debounce(fn, ms) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}
