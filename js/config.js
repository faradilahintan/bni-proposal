/* ============================================
   CONFIG.JS — Load config.json, apply to UI
   RM fills in their info via the cover slide
   inputs; config.json sets app-level defaults.
   ============================================ */

const Config = (() => {
  let data = {};

  async function load() {
    try {
      const r = await fetch('./config.json?v=' + Date.now());
      data = await r.json();
    } catch (e) {
      console.warn('config.json not found, using defaults');
      data = { version: '1.0.0', company: 'BNI', branch: '', wilayah: '', footer: '' };
    }
    applyDefaults();
  }

  function applyDefaults() {
    // Show version in console for debugging
    console.log(`BNI Digital Proposal v${data.version || '?'} — Team Edition`);

    // Pre-fill footer
    const footers = document.querySelectorAll('.slide-footer');
    footers.forEach(f => {
      if (data.footer) f.textContent = data.footer;
    });

    // Pre-fill branch label
    const branchEls = document.querySelectorAll('[data-branch]');
    branchEls.forEach(el => el.textContent = data.branch || '');

    // Pre-fill wilayah label
    const wilEls = document.querySelectorAll('[data-wilayah]');
    wilEls.forEach(el => el.textContent = data.wilayah || '');

    // Version badge
    const vBadge = document.getElementById('version-badge');
    if (vBadge) vBadge.textContent = 'v' + (data.version || '1.0');
  }

  // Called every slide update — syncs cover inputs → closing slide + all footers
  function syncClosing() {
    const name    = document.getElementById('inp-name')?.value    || '—';
    const phone   = document.getElementById('inp-phone')?.value   || '—';
    const branch  = document.getElementById('inp-branch')?.value  || '';
    const wilayah = document.getElementById('inp-wilayah')?.value || '';
    const el = id => document.getElementById(id);

    // Sync closing slide
    if (el('cl-name'))    el('cl-name').textContent    = name;
    if (el('cl-phone'))   el('cl-phone').textContent   = phone;
    if (el('cl-branch'))  el('cl-branch').textContent  = branch  || '—';
    if (el('cl-wilayah')) el('cl-wilayah').textContent = wilayah || '—';

    // Sync all slide footers
    const footerText = [branch, wilayah].filter(Boolean).join(' — ');
    document.querySelectorAll('.slide-footer').forEach(f => {
      f.textContent = footerText || (data.footer || '');
    });

    // Sync compliance-bar section label if branch is typed
    // (optional: middle label in top bars)
  }

  function get(key) { return data[key]; }

  return { load, syncClosing, get };
})();
