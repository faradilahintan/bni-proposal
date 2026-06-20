/* ============================================
   MEETING.JS — Post-meeting summary generator
   Combines: simulation history + slides viewed
   into a follow-up draft ready to copy/share.
   ============================================ */

const Meeting = (() => {

  // Track which slides were visited this session
  const visited = new Set();

  function trackSlide(idx) {
    visited.add(idx);
  }

  // Clears the set of "products discussed" — called when starting
  // a new client session. Does NOT touch SimHistory (separate module).
  function resetVisited() {
    visited.clear();
  }

  // Map slide index → readable product name
  // Keep in sync with SLIDE_NAMES in share.js
  const SLIDE_NAMES = [
    'Cover',
    'Ekosistem Produk',
    'KMK Rekening Koran',
    'KMK Plafond & Termloan',
    'Kredit Investasi',
    'SCF & SPAN',
    'Xpora — Overview',
    'Xpora — Fast Trex',
    'Bank Garansi',
    'Plafond GB & Syarat',
    'Trade Service',
    'BNI Direct',
    'Payroll',
    'Kalkulator Kredit',
    'Working Capital Calculator',
    'Penutup',
  ];

  // Slides that represent actual "products" (skip Cover, Ekosistem, Kalkulator, Penutup)
  const PRODUCT_SLIDE_INDICES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  function getRMInfo() {
    return {
      name:    document.getElementById('inp-name')?.value    || '',
      phone:   document.getElementById('inp-phone')?.value   || '',
      branch:  document.getElementById('inp-branch')?.value  || '',
      wilayah: document.getElementById('inp-wilayah')?.value || '',
    };
  }

  function getProductsDiscussed() {
    return PRODUCT_SLIDE_INDICES
      .filter(i => visited.has(i))
      .map(i => SLIDE_NAMES[i]);
  }

  // Build plain-text summary — used for WhatsApp/Email/copy
  function buildSummaryText() {
    const rm        = getRMInfo();
    const products  = getProductsDiscussed();
    const sims       = SimHistory.getAll();
    const dateStr    = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    let txt = `RINGKASAN PERTEMUAN — ${dateStr}\n`;
    txt += `${'─'.repeat(32)}\n\n`;

    if (products.length > 0) {
      txt += `PRODUK YANG DIBAHAS:\n`;
      products.forEach(p => txt += `• ${p}\n`);
      txt += `\n`;
    }

    if (sims.length > 0) {
      txt += `HASIL SIMULASI:\n\n`;
      // Show most relevant (latest per product) — reverse to chronological
      const chronological = [...sims].reverse();
      chronological.forEach(s => {
        txt += `${s.label} (${s.time})\n`;
        s.rows.forEach(r => txt += `   ${r.label}: ${r.value}\n`);
        txt += `\n`;
      });
    }

    if (products.length === 0 && sims.length === 0) {
      txt += `Belum ada produk atau simulasi yang dibahas pada sesi ini.\n\n`;
    }

    txt += `${'─'.repeat(32)}\n`;
    txt += `Disiapkan oleh:\n${rm.name || '[Nama RM]'}\n`;
    if (rm.branch)  txt += `${rm.branch}\n`;
    if (rm.wilayah) txt += `${rm.wilayah}\n`;
    if (rm.phone)   txt += `${rm.phone}\n`;
    txt += `\nPT Bank Negara Indonesia (Persero) Tbk`;

    return txt;
  }

  // ── UI: Summary Panel ──
  function openPanel() {
    let panel = document.getElementById('meeting-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'meeting-panel';
      document.body.appendChild(panel);

      const style = document.createElement('style');
      style.textContent = `
        #meeting-panel {
          display:none; position:fixed; inset:0; z-index:9998;
          background:rgba(10,34,64,.4); backdrop-filter:blur(4px);
          align-items:flex-end; justify-content:center;
        }
        #meeting-panel.open { display:flex; }
        #meeting-inner {
          background:white; border-radius:20px 20px 0 0;
          padding:20px 20px 16px; width:100%; max-width:480px;
          max-height:82vh; overflow-y:auto;
          box-shadow:0 -8px 32px rgba(0,0,0,.15);
          border-top:3px solid var(--green);
        }
        #meeting-text-box {
          background:var(--bg2); border:1.5px solid var(--border);
          border-radius:12px; padding:14px; font-size:11px;
          color:var(--navy); white-space:pre-wrap; line-height:1.6;
          max-height:280px; overflow-y:auto; margin-bottom:14px;
          font-family:'Courier New', monospace;
        }
      `;
      document.head.appendChild(style);
    }

    renderPanel();
    panel.classList.add('open');
  }

  function closePanel() {
    document.getElementById('meeting-panel')?.classList.remove('open');
  }

  function renderPanel() {
    const panel = document.getElementById('meeting-panel');
    if (!panel) return;

    const products = getProductsDiscussed();
    const sims      = SimHistory.getAll();
    const summary   = buildSummaryText();

    panel.innerHTML = `
      <div id="meeting-inner">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
          <span style="font-size:14px;font-weight:800;color:var(--navy)">📝 Ringkasan Pertemuan</span>
          <button onclick="Meeting.closePanel()" style="background:var(--bg2);border:none;border-radius:50%;width:28px;height:28px;cursor:pointer;font-size:14px;color:var(--text2)">✕</button>
        </div>
        <div style="font-size:11px;color:var(--text3);margin-bottom:14px">
          ${products.length} produk dibahas · ${sims.length} simulasi dihitung
        </div>

        <div id="meeting-text-box">${escapeHTML(summary)}</div>

        <button onclick="Meeting.copyToClipboard()" id="btn-meeting-copy" style="
          width:100%;display:flex;align-items:center;justify-content:center;gap:8px;
          padding:12px;background:var(--navy);color:white;border:none;border-radius:10px;
          cursor:pointer;margin-bottom:10px;font-family:inherit;font-size:13px;font-weight:700">
          📋 Copy Teks
        </button>

        <button onclick="Meeting.shareWhatsApp()" style="
          width:100%;display:flex;align-items:center;justify-content:center;gap:8px;
          padding:12px;background:#25D366;color:white;border:none;border-radius:10px;
          cursor:pointer;margin-bottom:10px;font-family:inherit;font-size:13px;font-weight:700">
          💬 Kirim via WhatsApp
        </button>

        <button onclick="Meeting.shareEmail()" style="
          width:100%;display:flex;align-items:center;justify-content:center;gap:8px;
          padding:12px;background:var(--orange);color:white;border:none;border-radius:10px;
          cursor:pointer;font-family:inherit;font-size:13px;font-weight:700">
          ✉️ Kirim via Email
        </button>
      </div>
    `;
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  async function copyToClipboard() {
    const text = buildSummaryText();
    try {
      await navigator.clipboard.writeText(text);
      const btn = document.getElementById('btn-meeting-copy');
      if (btn) {
        const original = btn.innerHTML;
        btn.innerHTML = '✅ Tersalin!';
        setTimeout(() => btn.innerHTML = original, 1800);
      }
    } catch (e) {
      // Fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  }

  function shareWhatsApp() {
    const text = buildSummaryText();
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  }

  function shareEmail() {
    const rm   = getRMInfo();
    const text = buildSummaryText();
    const subject = encodeURIComponent(`Ringkasan Pertemuan — ${rm.branch || 'BNI'}`);
    const body     = encodeURIComponent(text);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  return {
    trackSlide,
    resetVisited,
    openPanel,
    closePanel,
    copyToClipboard,
    shareWhatsApp,
    shareEmail,
    buildSummaryText, // exposed for share.js PDF integration
  };
})();
