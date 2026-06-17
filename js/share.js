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

  // ── PDF Export ──
  async function exportPDF() {
    const ok = await ensureLibraries();
    if (!ok) return;

    const slides = document.querySelectorAll('.slide');
    const total  = slides.length;
    const { jsPDF } = window.jspdf;

    // A4 landscape in mm
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const W = pdf.internal.pageSize.getWidth();   // 297mm
    const H = pdf.internal.pageSize.getHeight();  // 210mm

    // Save current state
    const currentActive = document.querySelector('.slide.active');
    const currentIdx    = Array.from(slides).indexOf(currentActive);

    showStatus(`Mengekspor slide 1 / ${total}...`);

    for (let i = 0; i < total; i++) {
      showStatus(`Mengekspor slide ${i + 1} / ${total}...`);

      // Temporarily make slide visible for capture
      const slide = slides[i];
      const wasActive = slide.classList.contains('active');

      // Force visible for capture without triggering deck transitions
      slide.style.cssText = 'position:absolute;inset:0;opacity:1;transform:none;pointer-events:none;z-index:-1';

      try {
        const canvas = await html2canvas(slide, {
          scale: 1.5,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          width:  window.innerWidth,
          height: window.innerHeight,
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
            el.id === 'share-toast'    ||
            el.id === 'install-banner' ||
            el.id === 'update-banner'  ||
            el.id === 'section-drawer',
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.88);

        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, 0, W, H);
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
    slides[currentIdx]?.classList.add('active');

    // Generate filename
    const rm      = getRMInfo();
    const date    = new Date().toISOString().slice(0,10);
    const fname   = `BNI_Proposal_${rm.branch.replace(/\s+/g,'_')}_${date}.pdf`;

    pdf.save(fname);
    showStatus('✅ PDF berhasil diunduh!');

    return fname;
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

        <button onclick="Share.exportPDF()" id="btn-pdf" style="
          width:100%;display:flex;align-items:center;gap:12px;
          padding:13px 16px;background:var(--navy);color:white;
          border:none;border-radius:10px;cursor:pointer;margin-bottom:10px;
          font-family:inherit;font-size:13px;font-weight:700;text-align:left;transition:opacity .2s">
          <span style="font-size:20px">📄</span>
          <div>
            <div>Download PDF</div>
            <div style="font-size:11px;font-weight:400;opacity:.65;margin-top:1px">Ekspor semua slide sebagai PDF</div>
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
          border:none;border-radius:10px;cursor:pointer;margin-bottom:14px;
          font-family:inherit;font-size:13px;font-weight:700;text-align:left;transition:opacity .2s">
          <span style="font-size:20px">✉️</span>
          <div>
            <div>Kirim via Email</div>
            <div style="font-size:11px;font-weight:400;opacity:.85;margin-top:1px">Buka email client dengan draft siap kirim</div>
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

  return { openPanel, exportPDF, shareWhatsApp, shareEmail };
})();
