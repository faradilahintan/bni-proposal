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

function annuity(principal, annualRate, months) {
  const r = annualRate / 100 / 12;
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
  const plafond = +document.getElementById('rk-plafond').value || 0;
  const tarik   = +document.getElementById('rk-tarik').value   || 0;
  const rate    = +document.getElementById('rk-r').value;

  const rBulan  = rate / 100 / 12;
  const rHarian = rate / 100 / 365;

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
}

/* ─────────────────────────────────────
   2. KMK TERMLOAN / KREDIT INVESTASI
   Model: anuitas
   ───────────────────────────────────── */
function calcKMK() {
  const p     = +document.getElementById('kmk-a').value || 0;
  const rate  = +document.getElementById('kmk-r').value;
  const tenor = +document.getElementById('kmk-t').value;
  const grace = +document.getElementById('kmk-g').value;

  const rBulan   = rate / 100 / 12;
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
}

/* ─────────────────────────────────────
   3. SCF / SPAN
   Model: flat interest on disbursed amount
   ───────────────────────────────────── */
function calcSCF() {
  const nilai  = +document.getElementById('scf-a').value || 0;
  const pctPem = +document.getElementById('scf-p').value / 100;
  const rate   = +document.getElementById('scf-r').value / 100;
  const hari   = +document.getElementById('scf-t').value;

  const disbursed = nilai * pctPem;
  const cost      = disbursed * rate * (hari / 365);
  const netProfit = nilai * 0.15 - cost; // asumsi margin proyek 15%

  setVal('scf-d', rp(disbursed));
  setVal('scf-c', rp(cost));
  setVal('scf-f', rp(nilai));
  setVal('scf-n', rp(netProfit));

  const netEl = document.getElementById('scf-n');
  if (netEl) netEl.className = 'r-val ' + (netProfit >= 0 ? 'positive' : 'negative');

  showResult('scf');
}

/* ─────────────────────────────────────
   4. BANK GARANSI
   Model: MD blocked + propisi quarterly + admin
   ───────────────────────────────────── */
function updateMD() {
  const v = document.getElementById('bg-type')?.value.split(',');
  if (!v) return;
  const prInput = document.getElementById('bg-pr');
  const prLabel = document.getElementById('bg-prv');
  if (prInput) prInput.value = v[1];
  if (prLabel) prLabel.textContent = v[1];
}

function calcBG() {
  const nilai    = +document.getElementById('bg-a').value || 0;
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
}

/* ─────────────────────────────────────
   5. CASH COLLATERAL CREDIT
   Model: net cost = kredit interest - deposito income
   ───────────────────────────────────── */
function calcCCC() {
  const dep    = +document.getElementById('ccc-d').value  || 0;
  const pctPl  = +document.getElementById('ccc-p').value  / 100;
  const rKredit= +document.getElementById('ccc-r').value  / 100 / 12;
  const rDep   = +document.getElementById('ccc-dr').value / 100 / 12;

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
}

/* ─────────────────────────────────────
   6. WORKING CAPITAL CALCULATOR (Module A)
   Model: Cash Conversion Cycle → Financing Gap
   ───────────────────────────────────── */
function calcWC() {
  const sales      = +document.getElementById('wc-sales').value    || 0;
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
