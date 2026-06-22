/* ============================================
   DECK.JS — Slide navigation engine
   Single source of truth for slide state
   ============================================ */

const Deck = (() => {
  let slides = [];
  let total  = 0;
  let cur    = 0;

  // Presenter notes per slide index
  const NOTES = [
    "Ketik nama & kontakmu dulu. Sebutkan nama klien, ucapkan terima kasih.",
    "Tanya dulu: 'Kebutuhan perbankan yang paling mendesak saat ini apa?'",
    "KMK RK = bayar BUNGA dari saldo yang ditarik, bukan angsuran penuh.",
    "Tanyakan: ada kontrak/SPK aktif? KMK Plafond sangat cocok.",
    "Tanya rencana investasi 2–3 tahun ke depan. Grace period cocok untuk konstruksi.",
    "Tanya: siapa buyer/principal utama? Atau ada proyek APBN/APBD?",
    "Xpora cocok untuk UMKM yang sudah/mau ekspor. Tanya: apa produknya, sudah ada buyer luar negeri?",
    "Fast Trex untuk UMKM yang SUDAH punya kontrak/PO ekspor. Highlight: plafond besar, agunan ringan, proses 5 hari kerja.",
    "Key point: jaminan aset tetap, MD rendah. Tanya: sering ikut tender?",
    "Highlight: cash collateral hanya 50% dari plafond GB — jauh lebih efisien!",
    "Tanya: ada transaksi ekspor/impor? BNI punya 8 overseas branches.",
    "Tanya: berapa transaksi transfer/payroll per bulan?",
    "Payroll = pintu masuk termudah. Hampir semua perusahaan butuh.",
    "MOMEN KRUSIAL — masukkan angka real klien. Efek ini lebih kuat dari brosur!",
    "Coba Working Capital Calculator — tunjukkan GAP kebutuhan modal klien.",
    "Tutup: 'Dari yang kita bahas, solusi mana yang paling relevan?' Lalu DIAM.",
  ];

  function init() {
    slides = Array.from(document.querySelectorAll('.slide'));
    total  = slides.length;
    buildDots();
    update();
    bindKeyboard();
    bindTouch();
  }

  function goTo(n) {
    if (n < 0 || n >= total || n === cur) return;
    const prev = slides[cur];
    prev.classList.remove('active');
    prev.classList.add('prev');
    setTimeout(() => prev.classList.remove('prev'), 500);
    cur = n;
    slides[cur].classList.add('active');
    update();
  }

  function next() { goTo(cur + 1); }
  function prev() { goTo(cur - 1); }

  function update() {
    // dots
    document.querySelectorAll('.dot').forEach((d, i) =>
      d.classList.toggle('active', i === cur)
    );
    // arrows
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    if (btnPrev) btnPrev.disabled = cur === 0;
    if (btnNext) btnNext.disabled = cur === total - 1;
    // progress
    const bar = document.getElementById('progress-bar');
    if (bar) bar.style.width = ((cur / (total - 1)) * 100) + '%';
    // counter
    const ctr = document.getElementById('slide-counter');
    if (ctr) ctr.textContent = (cur + 1) + ' / ' + total;
    // presenter
    const pNote = document.getElementById('p-note');
    if (pNote && document.getElementById('presenter-bar').classList.contains('show')) {
      pNote.textContent = NOTES[cur] || '—';
    }
    // sync closing slide contact info
    if (typeof Config !== 'undefined') Config.syncClosing();
    // lazy load images for current + next slide
    if (typeof LazyImages !== 'undefined') {
      LazyImages.loadForSlide(cur);
      LazyImages.loadForSlide(cur + 1);
    }
    // track slide visit for meeting summary
    if (typeof Meeting !== 'undefined') Meeting.trackSlide(cur);
  }

  function buildDots() {
    const c = document.getElementById('nav-dots');
    if (!c) return;
    c.innerHTML = '';
    slides.forEach((_, i) => {
      const b = document.createElement('button');
      b.className = 'dot' + (i === 0 ? ' active' : '');
      b.setAttribute('aria-label', 'Slide ' + (i + 1));
      b.onclick = () => goTo(i);
      c.appendChild(b);
    });
  }

  function bindKeyboard() {
    document.addEventListener('keydown', e => {
      const tag = document.activeElement.tagName;
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(tag)) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next();
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   prev();
      if (e.key === 'Escape') {
        Menu.close();
        Presenter.hide();
      }
    });
  }

  function bindTouch() {
    let tx = 0, ty = 0, drag = false;
    document.addEventListener('touchstart', e => {
      tx = e.touches[0].clientX;
      ty = e.touches[0].clientY;
      drag = true;
    }, { passive: true });
    document.addEventListener('touchend', e => {
      if (!drag) return;
      drag = false;
      const dx = e.changedTouches[0].clientX - tx;
      const dy = e.changedTouches[0].clientY - ty;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
        if (dx < 0) next(); else prev();
      }
    });
    document.addEventListener('touchmove', e => {
      if (Math.abs(e.touches[0].clientX - tx) > Math.abs(e.touches[0].clientY - ty))
        e.preventDefault();
    }, { passive: false });
  }

  function getCurrent() { return cur; }
  function getNotes()   { return NOTES; }

  return { init, goTo, next, prev, getCurrent, getNotes };
})();

/* ── Menu ── */
const Menu = (() => {
  let open = false;
  function toggle() {
    open = !open;
    document.getElementById('section-drawer').classList.toggle('open', open);
  }
  function close() {
    open = false;
    document.getElementById('section-drawer')?.classList.remove('open');
  }
  function init() {
    document.addEventListener('click', e => {
      if (!e.target.closest('#section-drawer') && !e.target.closest('#section-btn'))
        close();
    });
  }
  return { toggle, close, init };
})();

/* ── Presenter mode ── */
const Presenter = (() => {
  let on = false;
  function toggle() {
    on = !on;
    const btn = document.getElementById('presenter-btn');
    const bar = document.getElementById('presenter-bar');
    btn.classList.toggle('on', on);
    btn.textContent = on ? '✕ PRESENTER' : 'PRESENTER';
    bar.classList.toggle('show', on);
    if (on) {
      const idx = Deck.getCurrent();
      document.getElementById('p-note').textContent = Deck.getNotes()[idx] || '—';
    }
  }
  function hide() {
    if (!on) return;
    on = false;
    document.getElementById('presenter-btn').classList.remove('on');
    document.getElementById('presenter-btn').textContent = 'PRESENTER';
    document.getElementById('presenter-bar').classList.remove('show');
  }
  return { toggle, hide };
})();

/* ============================================
   COMPLIANCE LOGOS
   Uses actual PNG files from icons/ folder.
   Files are SW-cached on first load → offline ready.
   To update logos: replace icons/logo-danantara.png
   and icons/logo-bni.png — no code changes needed.
   ============================================ */
const Logos = (() => {

  // Danantara PNG has black background — display with rounded corners on light bar
  // BNI PNG has transparent/white bg — display cleanly
  const DANANTARA_IMG = `<img src="icons/logo-danantara.png" alt="Danantara Indonesia"
    style="height:24px;width:auto;max-width:120px;object-fit:contain;display:block;border-radius:4px"/>`;
  const BNI_IMG = `<img src="icons/logo-bni.png" alt="BNI Bank Negara Indonesia"
    style="height:28px;width:auto;max-width:80px;object-fit:contain;display:block"/>`;

  function makeBar(sectionText = '') {
    return `<div class="compliance-bar">
      <div class="compliance-bar-wrap">
        <div class="logo-left">${DANANTARA_IMG}</div>
        ${sectionText ? `<div class="section-label">${sectionText}</div>` : ''}
        <div class="logo-right">${BNI_IMG}</div>
      </div>
    </div>`;
  }

  function inject() {
    // Replace all .top-bar elements
    document.querySelectorAll('.top-bar').forEach(bar => {
      const sectionText = bar.querySelector('.tb-section')?.textContent || '';
      const newBar = document.createElement('div');
      newBar.innerHTML = makeBar(sectionText);
      bar.replaceWith(newBar.firstElementChild);
    });

    // Cover slide — inject after stripe
    const coverSlide = document.querySelector('.slide:first-child');
    if (coverSlide) {
      const stripe = coverSlide.querySelector('.stripe');
      if (stripe && !stripe.nextElementSibling?.classList.contains('compliance-bar')) {
        const el = document.createElement('div');
        el.innerHTML = makeBar();
        stripe.insertAdjacentElement('afterend', el.firstElementChild);
      }
    }

    // Calc headers (no .top-bar) — prepend bar
    document.querySelectorAll('.calc-header').forEach(ch => {
      if (!ch.querySelector('.compliance-bar')) {
        const el = document.createElement('div');
        el.innerHTML = makeBar();
        // Add bottom border only
        el.firstElementChild.style.borderBottom = '1px solid var(--border)';
        el.firstElementChild.style.marginBottom = '8px';
        ch.prepend(el.firstElementChild);
      }
    });
  }

  return { inject };
})();

/* ============================================
   LAZY IMAGE LOADER
   Loads Unsplash images after slide renders.
   Falls back gracefully if offline — shows emoji.
   ============================================ */
const LazyImages = (() => {
  function load(img) {
    if (!img || img.dataset.loaded) return;
    img.dataset.loaded = 'true';

    const src = img.dataset.src;
    if (!src) return;

    const container = img.closest('.img-accent, .cover-img-bg');
    const isAccent = container && container.classList.contains('img-accent');

    const tempImg = new Image();
    tempImg.onload = () => {
      if (isAccent) {
        // Use background-image — far more reliable than <img object-fit>
        // when this slide is later captured by html2canvas for PDF export.
        container.style.backgroundImage = `url("${src}")`;
      } else {
        // Cover slide background still uses a real <img> (covers the
        // whole slide, object-fit works fine there since it's full-bleed
        // and we no longer rely on filter() for darkening — see
        // .cover-img-overlay instead).
        img.src = src;
        img.classList.add('loaded');
      }
    };
    tempImg.onerror = () => {
      // offline fallback — hide img, show emoji fallback
      img.style.display = 'none';
      const fallback = container?.querySelector('.img-fallback');
      if (fallback) fallback.style.display = 'flex';
    };
    tempImg.src = src;
  }

  function loadForSlide(slideIndex) {
    const slide = document.querySelectorAll('.slide')[slideIndex];
    if (!slide) return;
    slide.querySelectorAll('img[data-src]').forEach(load);
  }

  function init() {
    // Load visible slide immediately
    loadForSlide(0);
  }

  return { loadForSlide, init };
})();

/* ============================================
   FONT SCALE
   Controls CSS zoom on #deck.
   Steps: 90%, 100%, 110%, 120%, 130%
   Default: 100%. Persisted to localStorage.
   Compliance bar, nav chrome stay unaffected.
   ============================================ */
const FontScale = (() => {
  const STEPS  = [0.90, 1.00, 1.10, 1.20, 1.30];
  const LABELS = ['90%', '100%', '110%', '120%', '130%'];
  const KEY    = 'bni-font-scale';

  let idx = 1; // default: 100%

  function apply() {
    const deck = document.getElementById('deck');
    if (!deck) return;

    const scale = STEPS[idx];

    // CSS zoom — scales everything inside #deck proportionally
    // Works on all modern browsers; Safari uses zoom, others transform
    deck.style.zoom = scale;

    // Fallback for browsers that don't support zoom well
    // (modern Chrome/Safari both handle zoom fine)

    // Update label
    const label = document.getElementById('scale-label');
    if (label) label.textContent = LABELS[idx];

    // Persist
    try { localStorage.setItem(KEY, idx); } catch(e) {}
  }

  function increase() {
    if (idx < STEPS.length - 1) { idx++; apply(); }
  }

  function decrease() {
    if (idx > 0) { idx--; apply(); }
  }

  function reset() {
    idx = 1; apply();
  }

  function buildUI() {
    // Controls now live inside the menu drawer (HTML, see index.html).
    // This just restores saved preference and syncs the label.
    try {
      const saved = localStorage.getItem(KEY);
      if (saved !== null) idx = Math.min(Math.max(parseInt(saved), 0), STEPS.length - 1);
    } catch(e) {}
    apply();
  }

  return { buildUI, increase, decrease, reset };
})();

/* ============================================
   HIGHLIGHT NOTES
   Visible, editable annotation boxes that DO
   get captured in PDF export — unlike presenter
   notes which are hidden and excluded.
   Persisted per-slide to localStorage so notes
   survive navigation and reload.
   ============================================ */
const Highlight = (() => {
  const STORAGE_KEY = 'bni-highlight-notes';
  let notes = {};

  function load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      notes = saved ? JSON.parse(saved) : {};
    } catch (e) { notes = {}; }
  }

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(notes)); } catch (e) {}
  }

  // Auto-grow textarea height to fit content
  function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }

  // Called once on boot — wires up every .highlight-textarea found in HTML,
  // restores saved text, and binds input listeners.
  function init() {
    load();
    document.querySelectorAll('.highlight-textarea').forEach(el => {
      const key = el.dataset.highlightKey;
      if (key && notes[key]) {
        el.value = notes[key];
      }
      autoResize(el);
      el.addEventListener('input', () => {
        autoResize(el);
        if (key) {
          notes[key] = el.value;
          persist();
          updateEmptyState(el);
        }
      });
      updateEmptyState(el);
    });
  }

  function updateEmptyState(el) {
    const wrap = el.closest('.highlight-wrap');
    if (!wrap) return;
    wrap.classList.toggle('is-empty', el.value.trim() === '');
  }

  // Toggle visibility of a highlight box (RM can hide if not relevant
  // for this particular client without losing the saved text)
  function toggle(key) {
    const wrap = document.querySelector(`[data-highlight-wrap="${key}"]`);
    if (wrap) wrap.classList.toggle('hidden');
  }

  return { init, toggle, autoResize };
})();
