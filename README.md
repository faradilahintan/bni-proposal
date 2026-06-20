# BNI Digital Proposal — Team Edition v1.6.1

Proposal interaktif PWA untuk Retail Relationship Manager BNI.

---

## Struktur Folder

```
bni-proposal/
├── index.html          ← Shell utama (slide, drawer menu, boot sequence)
├── manifest.json         PWA config
├── sw.js                 Service worker (offline + versioning) — ✏️ EDIT VERSI DI SINI
├── config.json           App-level config (versi, footer, daftar produk)
├── README.md             Dokumen ini
│
├── css/
│   ├── base.css          Variables warna, typography, komponen umum
│   ├── deck.css          Slide engine, navigasi, compliance bar, font scale
│   └── calc.css          Kalkulator & form styles
│
├── js/
│   ├── config.js         Load & apply config.json, sync cover → footer/closing
│   ├── deck.js            Slide navigation, Logos, LazyImages, FontScale
│   ├── calc.js            Semua kalkulator + SimHistory + Session reset
│   ├── meeting.js         Ringkasan pertemuan (produk dibahas + hasil simulasi)
│   └── share.js           Export PDF (slide picker) + WhatsApp + Email
│
└── icons/
    ├── logo-bni.png        Logo BNI asli (kanan, compliance bar)
    └── logo-danantara.png  Logo Danantara asli (kiri, compliance bar)
```

---

## Cara Edit Konten

### Ganti nama/kontak RM
Ketik langsung di cover slide saat akan presentasi (Nama, No. HP, Kantor Cabang, Kantor Wilayah) — otomatis sync ke footer setiap slide dan slide penutup. Tidak perlu edit file apapun.

### Ganti konfigurasi global
Edit `config.json`:
```json
{
  "version": "1.6.1",
  "footer": "PT Bank Negara Indonesia (Persero) Tbk",
  "products_enabled": ["kmk-rk", "kmk-tl", "ki", "scf", "span", "bg", "trade", "direct", "payroll"]
}
```
> Catatan: `branch` dan `wilayah` **tidak lagi** disimpan di sini — keduanya sudah dipindah jadi input di cover slide.

### Ganti logo Danantara / BNI
Replace file `icons/logo-danantara.png` dan/atau `icons/logo-bni.png` dengan file baru, **nama file harus sama**. Tidak perlu edit kode — logo otomatis muncul di setiap compliance bar (top setiap slide + cover + kalkulator).

### Tambah gambar ke slide
Cari komentar `<!-- EDIT SINI -->` di `index.html`. Simpan gambar ke folder `icons/`, lalu:
```html
<img src="icons/nama-gambar.png" style="width:100%;border-radius:10px;margin-bottom:14px"/>
```

### Ganti warna tema
Edit `:root` di `css/base.css`:
```css
:root {
  --orange: #e8461a;   ← Warna aksen utama BNI
  --navy:   #0a2240;   ← Warna navy BNI
}
```

### Tambah/hapus slide
Di `index.html`, setiap slide adalah blok:
```html
<div class="slide" data-note="Catatan presenter di sini">
  ...isi slide...
</div>
```
Setelah menambah/menghapus slide, **wajib** update 3 tempat lain agar tetap konsisten:
1. `#section-drawer` di `index.html` — daftar menu navigasi
2. `NOTES` array di `js/deck.js` — catatan presenter per index slide
3. `SLIDE_NAMES` array di `js/share.js` **dan** `js/meeting.js` — nama slide untuk PDF picker & ringkasan

### Tambah kalkulator baru
1. Tambah fungsi `calcXXX()` di `js/calc.js`, akhiri dengan `SimHistory.log(...)` agar hasilnya otomatis tercatat di riwayat
2. Tambah HTML panel `.cpanel` di slide kalkulator
3. Tambah tombol tab `.ctab` di header kalkulator
4. Tambah ke `ORDER` array di `CalcTabs` (dalam `calc.js`)

---

## Fitur Lengkap (v1.6.1)

### Presentasi
- 14 slide: Cover, Ekosistem, 5× Lending, 2× Bank Garansi, Trade, BNI Direct, Payroll, 2× Kalkulator, Penutup
- Swipe / tombol ‹ › / keyboard arrow untuk navigasi
- Menu cepat (☰) untuk lompat ke slide manapun
- Presenter mode — catatan tersembunyi per slide, hanya RM yang lihat
- Kontrol ukuran teks (A− / 100% / A+) di dalam menu drawer — scale seluruh konten tanpa distorsi
- Compliance bar (Danantara kiri, BNI kanan) di setiap slide — logo asli, offline-ready

### Kalkulator
- **Working Capital Calculator** — hitung gap modal kerja dari Cash Conversion Cycle (omzet, margin, hari stok/piutang/hutang)
- **KMK Rekening Koran** — model bunga dari saldo ditarik (bukan plafond penuh)
- **KMK Termloan / Kredit Investasi** — simulasi anuitas dengan grace period
- **SCF / SPAN** — simulasi dana cair + estimasi laba bersih proyek
- **Bank Garansi** — hitung marginal deposit + propisi per triwulan + total biaya
- **Cash Collateral Credit** — plafond vs bunga deposito

### Riwayat & Ringkasan
- **Riwayat Simulasi** — setiap hasil "Hitung" otomatis tersimpan dengan timestamp, bisa dihapus per-item atau semua
- **Ringkasan Pertemuan** — generate teks otomatis: produk yang dibahas + semua hasil simulasi, siap copy/WhatsApp/email
- **Reset Sesi / Klien Baru** — tombol manual di menu untuk membersihkan riwayat sebelum bertemu klien baru
- **Auto-prompt saat reload** — kalau ada riwayat tersisa dari sesi sebelumnya, app tanya "lanjutkan atau klien baru?"

### Export & Share
- **Download PDF** dengan slide picker — pilih slide mana saja yang mau diekspor, tidak harus semua
- PDF selalu landscape konsisten (1280×720 fixed capture) — tidak squeeze meskipun dibuka dari HP portrait
- **Share WhatsApp** — pesan profesional otomatis terisi nama RM, kontak, link proposal
- **Share Email** — draft email siap kirim dengan format formal

### PWA
- Installable ke homescreen (Android & iOS)
- Bekerja offline setelah pertama kali dibuka online
- Auto-update notification — banner muncul saat versi baru tersedia di GitHub
- Light theme dipaksa — tidak terpengaruh dark mode device

---

## Deploy ke GitHub Pages

### Pertama kali setup

1. Buat akun GitHub (gratis) di github.com
2. Buat repository baru — Public, beri nama misal `bni-proposal`
3. Upload semua file & folder (drag & drop ke halaman repo)
4. Settings → Pages → Source: **Deploy from a branch** → Branch: **main** → folder **/ (root)** → Save
5. Tunggu 1–2 menit, URL proposal:
   ```
   https://USERNAME.github.io/bni-proposal/
   ```
6. Share link ke tim — mereka bisa langsung buka & install ke homescreen

### Update konten (setelah setup awal)

1. Edit file yang perlu diubah langsung di GitHub (klik file → ✏️ → edit → Commit changes)
2. **WAJIB setiap deploy**: naikkan `CACHE_VERSION` di `sw.js`
   ```js
   const CACHE_VERSION = 'bni-proposal-v1.6.2';  // contoh: naikkan angka terakhir
   ```
   Tanpa langkah ini, browser mengira tidak ada perubahan dan tetap pakai cache lama.
3. Tim yang sudah install otomatis dapat banner "🔄 Versi baru tersedia" saat online, tap untuk update.

> Tips: jadikan kebiasaan — *setiap kali commit perubahan apapun, langsung naikkan satu digit terakhir versi di `sw.js`.*

---

## Install ke Homescreen

**Android (Chrome):** Buka URL → titik tiga pojok kanan → "Add to Home screen"

**iPhone/iPad (Safari):** Buka URL → tombol Share (kotak + panah) → "Add to Home Screen"

Setelah install, app bisa dibuka offline kapan saja seperti aplikasi biasa.

---

## Catatan Teknis Penting

- **Riwayat simulasi tersimpan per-device** (`localStorage`), bukan per-akun atau cloud sync. Kalau pindah device, riwayat tidak ikut.
- **Edit teks/konten masih hardcode** di `index.html` — belum ada sistem CMS terpisah. Setiap perubahan teks produk/rate harus commit ke GitHub agar terlihat oleh semua orang yang akses link.
- **PDF export** memuat library `html2canvas` + `jsPDF` dari CDN hanya saat tombol ditekan (tidak dibundle) — butuh koneksi internet sesaat pertama kali fitur ini dipakai dalam sesi.

---

*PT Bank Negara Indonesia (Persero) Tbk · v1.6.1*
