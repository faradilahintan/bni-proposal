/* ============================================
   CALC.JS — All calculator logic
   Each product has its own named function.
   Add new calculators here without touching HTML.
   ============================================ */

/* ── Helpers ── */
const rp = n => {
  // Indonesian format: dots as thousands, no decimal for whole numbers
  // e.g. 1500000 → Rp 1.500.000
  const num = Math.round(n);
  return 'Rp ' + num.toLocaleString('id-ID');
};

// Also export for use in PDF module
window.rpFormat = rp;
const pct = n => n.toFixed(1) + '%';

// Bank-day convention: 1 year = 360 days, 1 month = 31 days.
// Monthly rate is derived from the daily rate (annual/360) × 31,
// NOT simply annual/12 — this matches BNI's internal day-count basis.
function monthlyRateFromAnnual(annualRatePct) {
  const dailyRate = annualRatePct / 100 / 360;
  return dailyRate * 31;
}

function annuity(principal, annualRate, months) {
  const r = monthlyRateFromAnnual(annualRate);
  if (!r || !months) return 0;
  return principal * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1);
}

function showResult(prefix) {
  const empty = document.getElementById(prefix + '-e');
  const rows  = document.getElementById(prefix + '-res');
  if (empty) empty.style.display = 'none';
  if (rows)  rows.classList.add('show');
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

/* ============================================
   RUPIAH INPUT LIVE FORMATTING
   Inputs with class "fi-rupiah" auto-format with
   dot thousand-separators while typing (e.g.
   "1000000" → "1.000.000"). Calculation functions
   should read these via getNum(id), which strips
   the dots back out before parsing to a number.
   ============================================ */

// Reads a (possibly dot-formatted) input's value as a clean number.
// Use this instead of +document.getElementById(id).value for any
// field with class "fi-rupiah".
function getNum(id) {
  const el = document.getElementById(id);
  if (!el) return 0;
  const raw = el.value.replace(/\./g, '').replace(/[^\d]/g, '');
  return raw ? parseInt(raw, 10) : 0;
}

function formatRupiahInput(el) {
  // Strip everything except digits, then re-insert dots every 3 digits
  const digits = el.value.replace(/[^\d]/g, '');
  if (!digits) { el.value = ''; return; }
  el.value = parseInt(digits, 10).toLocaleString('id-ID');
}

function initRupiahInputs() {
  document.querySelectorAll('.fi-rupiah').forEach(el => {
    // Format on every keystroke
    el.addEventListener('input', () => {
      const cursorWasAtEnd = el.selectionStart === el.value.length;
      formatRupiahInput(el);
      if (cursorWasAtEnd) {
        el.selectionStart = el.selectionEnd = el.value.length;
      }
    });
    // Normalize initial value on load (in case HTML had raw digits)
    formatRupiahInput(el);
  });
}

/* ============================================
   SIM HISTORY — Tracks every calculation made
   during the session. Persisted to localStorage
   so it survives accidental refresh.
   Used by: history panel (this file) + meeting
   summary (meeting.js) + PDF export (share.js).
   ============================================ */
const SimHistory = (() => {
  const KEY = 'bni-sim-history';
  let items = [];

  function load() {
    try {
      const saved = localStorage.getItem(KEY);
      items = saved ? JSON.parse(saved) : [];
    } catch(e) { items = []; }
  }

  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch(e) {}
  }

  // label: human readable product name, e.g. "KMK Rekening Koran"
  // rows: array of {label, value} — the result lines shown to the user
  function log(label, rows) {
    items.unshift({
      id: Date.now(),
      label,
      rows,
      time: new Date().toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }),
    });
    // Cap at 30 entries so localStorage doesn't bloat
    if (items.length > 30) items = items.slice(0, 30);
    persist();
    renderBadge();
  }

  function removeItem(id) {
    items = items.filter(i => i.id !== id);
    persist();
    renderPanel();
    renderBadge();
  }

  function clearAll() {
    items = [];
    persist();
    renderPanel();
    renderBadge();
  }

  function getAll() { return items; }

  function renderBadge() {
    const badge = document.getElementById('sim-history-badge');
    if (!badge) return;
    if (items.length > 0) {
      badge.textContent = items.length;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }

  function openPanel() {
    let panel = document.getElementById('sim-history-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'sim-history-panel';
      document.body.appendChild(panel);

      const style = document.createElement('style');
      style.textContent = `
        #sim-history-panel {
          display:none; position:fixed; inset:0; z-index:9998;
          background:rgba(10,34,64,.4); backdrop-filter:blur(4px);
          align-items:flex-end; justify-content:center;
        }
        #sim-history-panel.open { display:flex; }
        #sim-history-inner {
          background:white; border-radius:20px 20px 0 0;
          padding:20px 20px 16px; width:100%; max-width:480px;
          max-height:78vh; overflow-y:auto;
          box-shadow:0 -8px 32px rgba(0,0,0,.15);
          border-top:3px solid var(--orange);
        }
        .sh-item {
          background:var(--bg2); border-radius:12px; padding:12px 14px;
          margin-bottom:10px; position:relative;
        }
        .sh-item-head { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px; }
        .sh-item-label { font-size:13px; font-weight:800; color:var(--navy); }
        .sh-item-time { font-size:10px; color:var(--text3); margin-top:2px; }
        .sh-item-del { background:none; border:none; color:var(--text3); cursor:pointer; font-size:13px; padding:2px 6px; }
        .sh-item-del:hover { color:var(--orange); }
        .sh-row { display:flex; justify-content:space-between; font-size:11px; padding:2px 0; }
        .sh-row-label { color:var(--text3); }
        .sh-row-val { color:var(--navy); font-weight:700; }
      `;
      document.head.appendChild(style);
    }
    renderPanel();
    panel.classList.add('open');
  }

  function closePanel() {
    document.getElementById('sim-history-panel')?.classList.remove('open');
  }

  function renderPanel() {
    const panel = document.getElementById('sim-history-panel');
    if (!panel) return;

    const itemsHTML = items.length === 0
      ? `<div style="text-align:center;padding:30px 14px;color:var(--text3);font-size:13px">
           Belum ada simulasi yang dihitung.<br/>Hasil kalkulator akan otomatis tersimpan di sini.
         </div>`
      : items.map(item => `
          <div class="sh-item">
            <div class="sh-item-head">
              <div>
                <div class="sh-item-label">${item.label}</div>
                <div class="sh-item-time">${item.time}</div>
              </div>
              <button class="sh-item-del" onclick="SimHistory.removeItem(${item.id})">✕</button>
            </div>
            ${item.rows.map(r => `
              <div class="sh-row">
                <span class="sh-row-label">${r.label}</span>
                <span class="sh-row-val">${r.value}</span>
              </div>
            `).join('')}
          </div>
        `).join('');

    panel.innerHTML = `
      <div id="sim-history-inner">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
          <span style="font-size:14px;font-weight:800;color:var(--navy)">📋 Riwayat Simulasi</span>
          <button onclick="SimHistory.closePanel()" style="background:var(--bg2);border:none;border-radius:50%;width:28px;height:28px;cursor:pointer;font-size:14px;color:var(--text2)">✕</button>
        </div>
        <div style="font-size:11px;color:var(--text3);margin-bottom:14px">Semua hasil hitung selama sesi ini, tersimpan otomatis.</div>

        ${itemsHTML}

        ${items.length > 0 ? `
          <button onclick="SimHistory.clearAll()" style="width:100%;margin-top:8px;padding:10px;border-radius:9px;border:1.5px solid var(--border);background:white;color:var(--text2);font-family:inherit;font-size:12px;font-weight:700;cursor:pointer">
            Hapus Semua Riwayat
          </button>
        ` : ''}
      </div>
    `;
  }

  load();

  return { log, removeItem, clearAll, getAll, openPanel, closePanel, renderBadge };
})();

/* ── Tab switcher ── */
const CalcTabs = (() => {
  const ORDER = ['rk', 'kmk', 'scf', 'bg', 'ccc', 'wc'];
  function switchTo(key) {
    document.querySelectorAll('.cpanel').forEach(p => p.classList.remove('on'));
    document.querySelectorAll('.ctab').forEach(t => t.classList.remove('on'));
    const panel = document.getElementById('cp-' + key);
    if (panel) panel.classList.add('on');
    const idx = ORDER.indexOf(key);
    const tabs = document.querySelectorAll('.ctab');
    if (idx >= 0 && tabs[idx]) tabs[idx].classList.add('on');
  }
  return { switchTo };
})();

/* ─────────────────────────────────────
   1. KMK REKENING KORAN
   Model: bunga dari saldo yang ditarik
   ───────────────────────────────────── */
function calcRK() {
  const plafond = getNum('rk-plafond');
  const tarik   = getNum('rk-tarik');
  const rate    = +document.getElementById('rk-r').value;

  // Bank-day convention: harian = tahunan/360, bulanan = harian × 31
  const rHarian = rate / 100 / 360;
  const rBulan  = rHarian * 31;

  const bungaAktual = tarik   * rBulan;
  const bungaPenuh  = plafond * rBulan;
  const bungaHarian = tarik   * rHarian;
  const hemat       = bungaPenuh - bungaAktual;

  setVal('rk-m',     rp(bungaAktual) + '/bln');
  setVal('rk-full',  rp(bungaPenuh)  + '/bln');
  setVal('rk-daily', rp(bungaHarian) + '/hari');
  setVal('rk-eff',   'Hemat ' + rp(hemat) + '/bln');

  const effEl = document.getElementById('rk-eff');
  if (effEl) effEl.classList.add('positive');

  showResult('rk');

  SimHistory.log('KMK Rekening Koran', [
    { label: 'Plafond', value: rp(plafond) },
    { label: 'Saldo Ditarik', value: rp(tarik) },
    { label: 'Bunga/Bulan', value: rp(bungaAktual) },
    { label: 'Hemat vs Tarik Penuh', value: rp(hemat) + '/bln' },
  ]);
}

/* ─────────────────────────────────────
   2. KMK TERMLOAN / KREDIT INVESTASI
   Model: anuitas
   ───────────────────────────────────── */
function calcKMK() {
  const p     = getNum('kmk-a');
  const rate  = +document.getElementById('kmk-r').value;
  const tenor = +document.getElementById('kmk-t').value;
  const grace = +document.getElementById('kmk-g').value;

  const rBulan   = monthlyRateFromAnnual(rate);
  const gracePay = p * rBulan;
  const months   = tenor - grace;
  const monthly  = annuity(p, rate, months);
  const totGrace = gracePay * grace;
  const totAfter = monthly * months;

  setVal('kmk-m',   rp(monthly) + '/bln');
  setVal('kmk-gp',  grace > 0 ? rp(gracePay) + '/bln' : 'Tidak ada grace period');
  setVal('kmk-i',   rp(totAfter + totGrace - p));
  setVal('kmk-tot', rp(totAfter + totGrace));
  showResult('kmk');

  SimHistory.log('KMK Termloan / Kredit Investasi', [
    { label: 'Jumlah Pinjaman', value: rp(p) },
    { label: 'Tenor', value: tenor + ' bulan' },
    { label: 'Angsuran/Bulan', value: rp(monthly) },
    { label: 'Total Pembayaran', value: rp(totAfter + totGrace) },
  ]);
}

/* ─────────────────────────────────────
   3. SCF / SPAN
   Model: flat interest on disbursed amount
   ───────────────────────────────────── */
function calcSCF() {
  const nilai  = getNum('scf-a');
  const pctPem = +document.getElementById('scf-p').value / 100;
  const rate   = +document.getElementById('scf-r').value / 100;
  const hari   = +document.getElementById('scf-t').value;

  const disbursed = nilai * pctPem;
  // Bank-day convention: 1 year = 360 days
  const cost      = disbursed * rate * (hari / 360);
  const netProfit = nilai * 0.15 - cost; // asumsi margin proyek 15%

  setVal('scf-d', rp(disbursed));
  setVal('scf-c', rp(cost));
  setVal('scf-f', rp(nilai));
  setVal('scf-n', rp(netProfit));

  const netEl = document.getElementById('scf-n');
  if (netEl) netEl.className = 'r-val ' + (netProfit >= 0 ? 'positive' : 'negative');

  showResult('scf');

  SimHistory.log('SCF / SPAN', [
    { label: 'Nilai Kontrak', value: rp(nilai) },
    { label: 'Dana Diterima', value: rp(disbursed) },
    { label: 'Biaya Bunga', value: rp(cost) },
    { label: 'Est. Laba Bersih', value: rp(netProfit) },
  ]);
}

/* ─────────────────────────────────────
   4. BANK GARANSI
   Model: MD blocked + propisi quarterly + admin
   ───────────────────────────────────── */
function updateMD() {
  // When user picks a GB type, auto-fill the suggested propisi rate
  // into the (now plain number input) propisi field.
  const v = document.getElementById('bg-type')?.value.split(',');
  if (!v) return;
  const prInput = document.getElementById('bg-pr');
  if (prInput) prInput.value = v[1];
}

function calcBG() {
  const nilai    = getNum('bg-a');
  const v        = document.getElementById('bg-type').value.split(',');
  const mdPct    = +v[0] / 100;
  const propisi  = +document.getElementById('bg-pr').value / 100;
  const tenor    = +document.getElementById('bg-t').value;

  const mdAmt    = nilai * mdPct;
  const prPerQ   = nilai * propisi / 4;
  const quarters = Math.ceil(tenor / 3);
  const totalPr  = prPerQ * quarters;
  const adm      = 500000;

  setVal('bg-md',  rp(mdAmt));
  setVal('bg-pr2', rp(prPerQ) + '/triwulan');
  setVal('bg-tpr', rp(totalPr));
  setVal('bg-tot', rp(totalPr + adm));
  showResult('bg');

  SimHistory.log('Bank Garansi', [
    { label: 'Nilai BG', value: rp(nilai) },
    { label: 'Marginal Deposit', value: rp(mdAmt) },
    { label: 'Jangka Waktu', value: tenor + ' bulan' },
    { label: 'Total Biaya', value: rp(totalPr + adm) },
  ]);
}

/* ─────────────────────────────────────
   5. CASH COLLATERAL CREDIT
   Model: net cost = kredit interest - deposito income
   ───────────────────────────────────── */
function calcCCC() {
  const dep    = getNum('ccc-d');
  const pctPl  = +document.getElementById('ccc-p').value  / 100;
  const rKredit= monthlyRateFromAnnual(+document.getElementById('ccc-r').value);
  const rDep   = monthlyRateFromAnnual(+document.getElementById('ccc-dr').value);

  const plafond   = dep * pctPl;
  const bungaKred = plafond * rKredit;
  const pendDep   = dep * rDep;
  const net       = bungaKred - pendDep;

  setVal('ccc-pl',  rp(plafond));
  setVal('ccc-mi',  rp(bungaKred) + '/bln');
  setVal('ccc-di',  rp(pendDep) + '/bln');
  setVal('ccc-net', rp(net) + '/bln');

  const netEl = document.getElementById('ccc-net');
  if (netEl) netEl.className = 'r-val ' + (net <= pendDep ? 'positive' : '');

  showResult('ccc');

  SimHistory.log('Cash Collateral Credit', [
    { label: 'Nilai Deposito', value: rp(dep) },
    { label: 'Plafond Kredit', value: rp(plafond) },
    { label: 'Biaya Bersih/Bulan', value: rp(net) },
  ]);
}

/* ─────────────────────────────────────
   6. WORKING CAPITAL CALCULATOR (Module A)
   Model: Cash Conversion Cycle → Financing Gap
   ───────────────────────────────────── */
function calcWC() {
  const sales      = getNum('wc-sales');
  const margin     = +document.getElementById('wc-margin').value   || 0;
  const invDays    = +document.getElementById('wc-inv').value      || 0;
  const recDays    = +document.getElementById('wc-rec').value      || 0;
  const payDays    = +document.getElementById('wc-pay').value      || 0;

  const cogs       = sales * (1 - margin / 100);
  const dailySales = sales / 30;
  const dailyCogs  = cogs / 30;

  // Operating / Cash Conversion Cycle
  const operCycle  = invDays + recDays;
  const cashCycle  = operCycle - payDays;

  // Working capital components
  const invNeeded  = dailyCogs * invDays;
  const recNeeded  = dailySales * recDays;
  const payDelay   = dailyCogs * payDays;
  const wcGap      = invNeeded + recNeeded - payDelay;
  const wcSafe     = wcGap * 1.15; // 15% buffer

  // Render cycle bar
  renderCycleBar(invDays, recDays, payDays, operCycle);

  setVal('wc-op-cycle',  operCycle + ' hari');
  setVal('wc-cash-cycle',cashCycle + ' hari');
  setVal('wc-inv-need',  rp(invNeeded));
  setVal('wc-rec-need',  rp(recNeeded));
  setVal('wc-pay-delay', rp(payDelay));
  setVal('wc-gap',       rp(wcGap));
  setVal('wc-recommend', rp(wcSafe));

  // Colour the gap row
  const gapEl = document.getElementById('wc-gap');
  if (gapEl) gapEl.className = 'r-val ' + (wcGap > 0 ? 'negative' : 'positive');

  const recEl = document.getElementById('wc-recommend');
  if (recEl) recEl.parentElement.classList.add('hl');

  showResult('wc');

  SimHistory.log('Working Capital Calculator', [
    { label: 'Omzet/Bulan', value: rp(sales) },
    { label: 'Cash Conversion Cycle', value: cashCycle + ' hari' },
    { label: 'Gap Modal Kerja', value: rp(wcGap) },
    { label: 'Rekomendasi Plafond', value: rp(wcSafe) },
  ]);
}

function renderCycleBar(inv, rec, pay, total) {
  const bar = document.getElementById('wc-cycle-bar');
  if (!bar || total === 0) return;

  const invW = Math.round((inv / total) * 100);
  const recW = Math.round((rec / total) * 100);
  const payW = Math.min(Math.round((pay / total) * 100), 100);

  bar.innerHTML = `
    <div style="display:flex;gap:2px;height:28px;border-radius:8px;overflow:hidden">
      <div style="flex:${invW};background:#fed7aa;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;color:#92400e" title="Inventory ${inv} hari">INV</div>
      <div style="flex:${recW};background:#bfdbfe;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;color:#1e40af" title="Receivable ${rec} hari">REC</div>
    </div>
    <div style="display:flex;gap:2px;height:14px;margin-top:2px">
      <div style="flex:${payW};background:#bbf7d0;border-radius:4px" title="Payable ${pay} hari offset"></div>
      <div style="flex:${100-payW}"></div>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:9px;color:var(--text3);margin-top:3px">
      <span>Hari 0</span>
      <span style="color:#92400e">Inventory ${inv}hr</span>
      <span style="color:#1e40af">+Piutang ${rec}hr</span>
      <span style="color:#166534">Utang offset −${pay}hr</span>
    </div>
  `;
}

/* ============================================
   SESSION — "Klien Baru" reset + auto-prompt
   Clears SimHistory + visited-slide tracking
   so data from a previous client doesn't bleed
   into the next meeting on the same device.
   ============================================ */
const Session = (() => {
  const PROMPT_SEEN_KEY = 'bni-session-prompt-seen';

  // Full reset: simulation history + slides-discussed tracking.
  // Does NOT touch RM name/phone/branch (cover inputs) — those
  // stay since it's still the same RM presenting.
  function resetForNewClient(skipConfirm = false) {
    const doReset = () => {
      SimHistory.clearAll();
      if (typeof Meeting !== 'undefined') Meeting.resetVisited();
      showResetToast();
    };

    if (skipConfirm) { doReset(); return; }

    const hasData = SimHistory.getAll().length > 0;
    if (!hasData) { doReset(); return; }

    if (confirm('Mulai sesi klien baru?\n\nRiwayat simulasi dan rangkuman produk yang sudah dibahas akan dihapus. Info RM (nama, kontak) tidak terpengaruh.')) {
      doReset();
    }
  }

  function showResetToast() {
    let toast = document.getElementById('share-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'share-toast';
      toast.style.cssText = `
        position:fixed; bottom:100px; left:50%; transform:translateX(-50%);
        padding:10px 20px; border-radius:10px; font-size:13px; font-weight:600;
        z-index:9999; white-space:nowrap; font-family:'Plus Jakarta Sans',sans-serif;
      `;
      document.body.appendChild(toast);
    }
    toast.textContent = '✅ Sesi baru dimulai — riwayat sebelumnya sudah dihapus';
    toast.style.background = 'var(--navy)';
    toast.style.color = 'white';
    toast.style.opacity = '1';
    toast.style.display = 'block';
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.style.display='none', 300); }, 3000);
  }

  // ── Auto-prompt on load ──
  // If there's leftover history from a previous session, ask once
  // per page-load whether to continue or start fresh.
  function checkOnBoot() {
    const hasData = SimHistory.getAll().length > 0;
    if (!hasData) return;

    showBootPrompt();
  }

  function showBootPrompt() {
    const sims = SimHistory.getAll();
    const lastTime = sims[0]?.time || '';

    const overlay = document.createElement('div');
    overlay.id = 'session-boot-prompt';
    overlay.style.cssText = `
      position:fixed; inset:0; z-index:10000;
      background:rgba(10,34,64,.55); backdrop-filter:blur(6px);
      display:flex; align-items:center; justify-content:center; padding:24px;
    `;
    overlay.innerHTML = `
      <div style="background:white;border-radius:18px;padding:24px 22px;max-width:340px;width:100%;box-shadow:0 12px 40px rgba(0,0,0,.2)">
        <div style="font-size:32px;margin-bottom:12px;text-align:center">👋</div>
        <div style="font-size:15px;font-weight:800;color:var(--navy);text-align:center;margin-bottom:8px">Ada Riwayat Tersimpan</div>
        <div style="font-size:12px;color:var(--text2);text-align:center;line-height:1.6;margin-bottom:18px">
          Ditemukan ${sims.length} simulasi dari sesi sebelumnya (${lastTime}).<br/>Apakah ini klien yang sama, atau klien baru?
        </div>
        <button onclick="Session.continueSession()" style="
          width:100%;padding:12px;border-radius:10px;background:var(--navy);color:white;
          border:none;cursor:pointer;font-family:inherit;font-size:13px;font-weight:700;margin-bottom:8px">
          Lanjutkan Sesi Ini
        </button>
        <button onclick="Session.startFreshFromPrompt()" style="
          width:100%;padding:12px;border-radius:10px;background:var(--orange);color:white;
          border:none;cursor:pointer;font-family:inherit;font-size:13px;font-weight:700">
          🔄 Klien Baru — Mulai Bersih
        </button>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  function continueSession() {
    document.getElementById('session-boot-prompt')?.remove();
  }

  function startFreshFromPrompt() {
    document.getElementById('session-boot-prompt')?.remove();
    resetForNewClient(true); // skip confirm — already confirmed via prompt choice
  }

  return { resetForNewClient, checkOnBoot, continueSession, startFreshFromPrompt };
})();
