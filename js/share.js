/* ============================================
   SHARE.JS — PDF Export + WhatsApp + Email share
   Uses html2canvas + jsPDF (loaded on demand).
   Libraries are NOT bundled — loaded from CDN
   only when user taps "Export PDF".
   ============================================ */

const Share = (() => {

  const CDN = {
    html2canvas: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
    jsPDF: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  };

  let librariesLoaded = false;

  // Load scripts on demand — only when PDF is actually requested
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
      const s = document.createElement('script');
      s.src = src; s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function ensureLibraries() {
    if (librariesLoaded) return true;
    try {
      showStatus('Memuat library PDF...');
      await loadScript(CDN.html2canvas);
      await loadScript(CDN.jsPDF);
      librariesLoaded = true;
      return true;
    } catch {
      showStatus('Gagal memuat library. Pastikan koneksi internet tersedia.', true);
      return false;
    }
  }

  // ── Status toast ──
  function showStatus(msg, isError = false) {
    let toast = document.getElementById('share-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'share-toast';
      toast.style.cssText = `
        position:fixed; bottom:100px; left:50%; transform:translateX(-50%);
        padding:10px 20px; border-radius:10px; font-size:13px; font-weight:600;
        z-index:9999; white-space:nowrap; transition:opacity .3s;
        box-shadow:0 4px 16px rgba(0,0,0,.15); font-family:'Plus Jakarta Sans',sans-serif;
      `;
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.background = isError ? '#e8461a' : '#0a2240';
    toast.style.color = 'white';
    toast.style.opacity = '1';
    toast.style.display = 'block';
    if (isError || msg.includes('✅')) {
      setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.style.display='none', 300); }, 3000);
    }
  }

  // ── Get RM info from cover inputs ──
  function getRMInfo() {
    return {
      name:    document.getElementById('inp-name')?.value    || 'BNI Relationship Manager',
      phone:   document.getElementById('inp-phone')?.value   || '',
      branch:  document.getElementById('inp-branch')?.value  || 'BNI',
      wilayah: document.getElementById('inp-wilayah')?.value || '',
    };
  }

  // ── Slide names for the picker UI ──
  // Keep in sync with slide order in index.html
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

  // ── PDF Export ──
  // Fixed: capture at a CONSISTENT slide aspect ratio (not raw device
  // viewport) so portrait phones don't stretch/squeeze into landscape A4.
  // selectedIndices: array of slide indices to export. If omitted/null,
  // exports all slides.
  async function exportPDF(selectedIndices = null) {
    const ok = await ensureLibraries();
    if (!ok) return;

    const allSlides = document.querySelectorAll('.slide');
    const indices = selectedIndices && selectedIndices.length
      ? selectedIndices
      : Array.from(allSlides).map((_, i) => i);

    if (indices.length === 0) {
      showStatus('Pilih minimal 1 slide untuk diekspor.', true);
      return;
    }

    // Hide empty highlight boxes during capture so blank placeholder
    // text/borders don't show up in the client-facing PDF. Boxes the
    // RM actually filled in stay fully visible — that's the whole
    // point of this feature.
    const hiddenForCapture = [];
    document.querySelectorAll('.highlight-wrap').forEach(wrap => {
      const ta = wrap.querySelector('.highlight-textarea');
      if (ta && ta.value.trim() === '' && !wrap.classList.contains('hidden')) {
        wrap.classList.add('hidden');
        hiddenForCapture.push(wrap);
      }
    });

    const total  = indices.length;
    const { jsPDF } = window.jspdf;

    // FIXED capture box — always the same regardless of phone/tablet/
    // laptop screen size. This guarantees the PDF always comes out
    // landscape like the original desktop design, no matter where
    // the export button is tapped from.
    const captureW = 1280;
    const captureH = 720;
    const ratio    = captureW / captureH;

    // A4 landscape in mm
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();   // 297mm
    const pageH = pdf.internal.pageSize.getHeight();  // 210mm

    // Fit the captured image INSIDE the page, preserving aspect ratio,
    // centered with a small margin — this is what prevents the squeeze.
    const margin = 6; // mm
    const maxW = pageW - margin * 2;
    const maxH = pageH - margin * 2;

    let drawW = maxW;
    let drawH = drawW / ratio;
    if (drawH > maxH) {
      drawH = maxH;
      drawW = drawH * ratio;
    }
    const offsetX = (pageW - drawW) / 2;
    const offsetY = (pageH - drawH) / 2;

    // Save current state
    const currentActive = document.querySelector('.slide.active');
    const currentIdx    = Array.from(allSlides).indexOf(currentActive);

    showStatus(`Mengekspor slide 1 / ${total}...`);

    for (let n = 0; n < indices.length; n++) {
      const i = indices[n];
      showStatus(`Mengekspor slide ${n + 1} / ${total}...`);

      const slide = allSlides[i];
      if (!slide) continue;
      const wasActive = slide.classList.contains('active');

      // Force slide to render at the SAME fixed box size for every
      // capture — this is the key fix. Without this, each device's
      // viewport size leaks into the captured image's aspect ratio.
      slide.style.cssText = `
        position:absolute; top:0; left:0;
        width:${captureW}px; height:${captureH}px;
        opacity:1; transform:none; pointer-events:none; z-index:-1;
      `;

      try {
        const canvas = await html2canvas(slide, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          width:  captureW,
          height: captureH,
          windowWidth:  captureW,
          windowHeight: captureH,
          ignoreElements: el =>
            el.id === 'progress-bar'   ||
            el.id === 'nav-dots'       ||
            el.id === 'nav-arrows'     ||
            el.id === 'slide-counter'  ||
            el.id === 'section-btn'    ||
            el.id === 'presenter-btn'  ||
            el.id === 'presenter-bar'  ||
            el.id === 'swipe-hint'     ||
            el.id === 'share-panel'    ||
            el.id === 'pdf-picker'     ||
            el.id === 'sim-history-panel' ||
            el.id === 'meeting-panel'  ||
            el.id === 'session-boot-prompt' ||
            el.id === 'share-toast'    ||
            el.id === 'install-banner' ||
            el.id === 'update-banner'  ||
            el.id === 'font-scale-btn' ||
            el.id === 'section-drawer',
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.88);

        if (n > 0) pdf.addPage();
        // Draw centered, aspect-ratio preserved — no stretch
        pdf.addImage(imgData, 'JPEG', offsetX, offsetY, drawW, drawH);
      } catch (err) {
        console.warn('Slide capture error:', err);
      }

      // Restore slide state
      slide.style.cssText = '';
      if (wasActive) {
        slide.classList.add('active');
      }
    }

    // Restore active slide
    allSlides[currentIdx]?.classList.add('active');

    // Restore visibility of empty highlight boxes we temporarily hid
    hiddenForCapture.forEach(wrap => wrap.classList.remove('hidden'));

    // Generate filename
    const rm      = getRMInfo();
    const date    = new Date().toISOString().slice(0,10);
    const suffix  = indices.length < allSlides.length ? '_Ringkas' : '';
    const fname   = `BNI_Proposal_${rm.branch.replace(/\s+/g,'_')}${suffix}_${date}.pdf`;

    pdf.save(fname);
    showStatus('✅ PDF berhasil diunduh!');

    return fname;
  }

  // ── PDF Slide Picker UI ──
  function openPdfPicker() {
    // Close share panel first
    document.getElementById('share-panel')?.classList.remove('open');

    let picker = document.getElementById('pdf-picker');
    if (picker) { picker.classList.add('open'); return; }

    const total = document.querySelectorAll('.slide').length;

    const itemsHTML = SLIDE_NAMES.map((name, i) => `
      <label class="pdf-pick-item">
        <input type="checkbox" class="pdf-pick-check" value="${i}" checked/>
        <span class="pdf-pick-num">${i + 1}</span>
        <span class="pdf-pick-name">${name}</span>
      </label>
    `).join('');

    picker = document.createElement('div');
    picker.id = 'pdf-picker';
    picker.innerHTML = `
      <div id="pdf-picker-inner">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
          <span style="font-size:14px;font-weight:800;color:var(--navy)">Pilih Slide untuk PDF</span>
          <button onclick="document.getElementById('pdf-picker').classList.remove('open')"
            style="background:var(--bg2);border:none;border-radius:50%;width:28px;height:28px;cursor:pointer;font-size:14px;color:var(--text2)">✕</button>
        </div>
        <div style="font-size:11px;color:var(--text3);margin-bottom:12px">${total} slide tersedia — semua terpilih secara default</div>

        <div style="display:flex;gap:8px;margin-bottom:12px">
          <button onclick="Share.toggleAllPicker(true)" style="flex:1;padding:8px;border-radius:8px;border:1.5px solid var(--border);background:white;font-size:11px;font-weight:700;color:var(--text2);cursor:pointer">Pilih Semua</button>
          <button onclick="Share.toggleAllPicker(false)" style="flex:1;padding:8px;border-radius:8px;border:1.5px solid var(--border);background:white;font-size:11px;font-weight:700;color:var(--text2);cursor:pointer">Kosongkan</button>
        </div>

        <div id="pdf-pick-list">${itemsHTML}</div>

        <button onclick="Share.confirmExport()" style="
          width:100%;margin-top:14px;padding:13px;border-radius:10px;
          background:var(--orange);color:white;border:none;cursor:pointer;
          font-family:inherit;font-size:14px;font-weight:800;">
          📄 Ekspor PDF (<span id="pdf-pick-count">${total}</span> slide)
        </button>
      </div>
    `;
    document.body.appendChild(picker);

    const style = document.createElement('style');
    style.textContent = `
      #pdf-picker {
        display:none; position:fixed; inset:0; z-index:9998;
        background:rgba(10,34,64,.4); backdrop-filter:blur(4px);
        align-items:flex-end; justify-content:center;
      }
      #pdf-picker.open { display:flex; }
      #pdf-picker-inner {
        background:white; border-radius:20px 20px 0 0;
        padding:20px 20px 16px; width:100%; max-width:480px;
        max-height:78vh; overflow-y:auto;
        box-shadow:0 -8px 32px rgba(0,0,0,.15);
        border-top:3px solid var(--orange);
        animation:slideUp .25s ease;
      }
      .pdf-pick-item {
        display:flex; align-items:center; gap:10px;
        padding:10px 8px; border-radius:8px; cursor:pointer;
        transition:background .15s;
      }
      .pdf-pick-item:hover { background:var(--bg2); }
      .pdf-pick-check { width:18px; height:18px; accent-color:var(--orange); cursor:pointer; flex-shrink:0; }
      .pdf-pick-num {
        width:22px; height:22px; border-radius:6px; background:var(--bg3);
        color:var(--text3); font-size:11px; font-weight:800;
        display:flex; align-items:center; justify-content:center; flex-shrink:0;
      }
      .pdf-pick-name { font-size:13px; font-weight:600; color:var(--navy); }
    `;
    document.head.appendChild(style);

    // Update count on any checkbox change
    picker.addEventListener('change', updatePickerCount);

    setTimeout(() => picker.classList.add('open'), 10);
  }

  function updatePickerCount() {
    const checked = document.querySelectorAll('.pdf-pick-check:checked').length;
    const countEl = document.getElementById('pdf-pick-count');
    if (countEl) countEl.textContent = checked;
  }

  function toggleAllPicker(checked) {
    document.querySelectorAll('.pdf-pick-check').forEach(cb => cb.checked = checked);
    updatePickerCount();
  }

  function confirmExport() {
    const selected = Array.from(document.querySelectorAll('.pdf-pick-check:checked'))
      .map(cb => parseInt(cb.value));

    if (selected.length === 0) {
      showStatus('Pilih minimal 1 slide.', true);
      return;
    }

    document.getElementById('pdf-picker')?.classList.remove('open');
    exportPDF(selected);
  }

  // ── WhatsApp Share ──
  function shareWhatsApp() {
    const rm  = getRMInfo();
    const url = window.location.href.split('?')[0]; // clean URL

    const msg = `Halo, terima kasih atas waktunya hari ini 🙏\n\nBerikut proposal digital BNI yang tadi kita bahas:\n\n${url}\n\nSilakan bisa dibuka langsung dari browser atau disimpan ke homescreen untuk akses offline.\n\nAny questions, feel free to reach out!\n\n*${rm.name}*\n${rm.branch}${rm.wilayah ? '\n' + rm.wilayah : ''}\n${rm.phone}`;

    const encoded = encodeURIComponent(msg);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  }

  // ── Email Share ──
  function shareEmail() {
    const rm  = getRMInfo();
    const url = window.location.href.split('?')[0];

    const subject = encodeURIComponent(`Proposal Kerjasama BNI — ${rm.branch}`);
    const body    = encodeURIComponent(
`Yth. Bapak/Ibu,

Terima kasih atas waktu dan diskusi yang sangat produktif hari ini.

Berikut kami sampaikan proposal digital BNI yang telah kami siapkan:
${url}

Proposal dapat dibuka langsung melalui browser dan tersedia secara offline setelah pertama kali diakses.

Kami berharap dapat segera menindaklanjuti diskusi kita dan mendukung pertumbuhan bisnis Bapak/Ibu bersama BNI.

Hormat kami,

${rm.name}
Relationship Manager
${rm.branch}${rm.wilayah ? '\n' + rm.wilayah : ''}
${rm.phone}

PT Bank Negara Indonesia (Persero) Tbk`
    );

    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  // ── Share Panel UI ──
  function openPanel() {
    let panel = document.getElementById('share-panel');
    if (panel) { panel.classList.toggle('open'); return; }

    panel = document.createElement('div');
    panel.id = 'share-panel';
    panel.innerHTML = `
      <div id="share-panel-inner">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <span style="font-size:14px;font-weight:800;color:var(--navy)">Kirim ke Klien</span>
          <button onclick="document.getElementById('share-panel').classList.remove('open')"
            style="background:var(--bg2);border:none;border-radius:50%;width:28px;height:28px;cursor:pointer;font-size:14px;color:var(--text2)">✕</button>
        </div>

        <button onclick="Share.openPdfPicker()" id="btn-pdf" style="
          width:100%;display:flex;align-items:center;gap:12px;
          padding:13px 16px;background:var(--navy);color:white;
          border:none;border-radius:10px;cursor:pointer;margin-bottom:10px;
          font-family:inherit;font-size:13px;font-weight:700;text-align:left;transition:opacity .2s">
          <span style="font-size:20px">📄</span>
          <div>
            <div>Download PDF</div>
            <div style="font-size:11px;font-weight:400;opacity:.65;margin-top:1px">Pilih slide & ekspor sebagai PDF</div>
          </div>
        </button>

        <button onclick="Share.shareWhatsApp()" style="
          width:100%;display:flex;align-items:center;gap:12px;
          padding:13px 16px;background:#25D366;color:white;
          border:none;border-radius:10px;cursor:pointer;margin-bottom:10px;
          font-family:inherit;font-size:13px;font-weight:700;text-align:left;transition:opacity .2s">
          <span style="font-size:20px">💬</span>
          <div>
            <div>Kirim via WhatsApp</div>
            <div style="font-size:11px;font-weight:400;opacity:.85;margin-top:1px">Share link proposal + pesan profesional</div>
          </div>
        </button>

        <button onclick="Share.shareEmail()" style="
          width:100%;display:flex;align-items:center;gap:12px;
          padding:13px 16px;background:var(--orange);color:white;
          border:none;border-radius:10px;cursor:pointer;margin-bottom:10px;
          font-family:inherit;font-size:13px;font-weight:700;text-align:left;transition:opacity .2s">
          <span style="font-size:20px">✉️</span>
          <div>
            <div>Kirim via Email</div>
            <div style="font-size:11px;font-weight:400;opacity:.85;margin-top:1px">Buka email client dengan draft siap kirim</div>
          </div>
        </button>

        <div style="height:1px;background:var(--border);margin:4px 0 12px"></div>

        <button onclick="document.getElementById('share-panel').classList.remove('open');Meeting.openPanel()" style="
          width:100%;display:flex;align-items:center;gap:12px;
          padding:13px 16px;background:var(--green);color:white;
          border:none;border-radius:10px;cursor:pointer;margin-bottom:14px;
          font-family:inherit;font-size:13px;font-weight:700;text-align:left;transition:opacity .2s">
          <span style="font-size:20px">📝</span>
          <div>
            <div>Ringkasan Pertemuan</div>
            <div style="font-size:11px;font-weight:400;opacity:.85;margin-top:1px">Rangkuman produk & simulasi yang sudah dibahas</div>
          </div>
        </button>

        <div style="font-size:10px;color:var(--text3);text-align:center;line-height:1.5">
          💡 Isi nama & kontak di cover slide dulu<br/>agar pesan terisi otomatis
        </div>
      </div>
    `;
    document.body.appendChild(panel);

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      #share-panel {
        display:none; position:fixed; bottom:0; left:0; right:0;
        z-index:9998; padding:0 16px 24px;
      }
      #share-panel.open { display:block; }
      #share-panel-inner {
        background:white; border-radius:20px 20px 0 0;
        padding:20px 20px 8px;
        box-shadow:0 -8px 32px rgba(0,0,0,.12);
        max-width:480px; margin:0 auto;
        border-top:3px solid var(--orange);
        animation:slideUp .25s ease;
      }
      @keyframes slideUp {
        from { transform:translateY(100%); opacity:0; }
        to   { transform:translateY(0);    opacity:1; }
      }
    `;
    document.head.appendChild(style);
    setTimeout(() => panel.classList.add('open'), 10);
  }

  return { openPanel, exportPDF, shareWhatsApp, shareEmail, openPdfPicker, toggleAllPicker, confirmExport };
})();
