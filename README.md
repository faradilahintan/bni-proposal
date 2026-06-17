# BNI Digital Proposal — Team Edition v1.2.0

Proposal interaktif PWA untuk Retail Relationship Manager BNI.

---

## Struktur Folder

```
bni-proposal/
├── index.html          ← Shell utama (jangan diedit kecuali perlu)
├── manifest.json       ← PWA config
├── sw.js               ← Service worker (offline support)
├── config.json         ← ✏️ Edit ini untuk konfigurasi app
│
├── css/
│   ├── base.css        ← Variables warna, typography, komponen
│   ├── deck.css        ← Slide engine, navigasi, chrome
│   └── calc.css        ← Kalkulator & form styles
│
├── js/
│   ├── config.js       ← Load & apply config.json
│   ├── deck.js         ← Slide navigation engine
│   └── calc.js         ← Semua logika kalkulator
│
└── icons/
    ├── icon-192.png    ← PWA icon (buat di realfavicongenerator.net)
    └── icon-512.png
```

---

## Cara Edit Konten

### Ganti nama/kontak RM
Ketik langsung di cover slide saat akan presentasi — otomatis sync ke slide penutup.

### Ganti konfigurasi global
Edit `config.json`:
```json
{
  "version": "1.2.0",      ← Update ini setiap deploy baru
  "branch": "RCC Jakarta Graha Elok Mas",
  "wilayah": "Kantor Wilayah 12 Jakarta Kota",
  "footer": "131222"
}
```

### Tambah gambar ke slide
Di `index.html`, cari komentar `<!-- EDIT SINI -->`.
Simpan gambar ke folder `icons/`, lalu tambahkan:
```html
<img src="icons/nama-gambar.png" style="width:100%;border-radius:10px;margin-bottom:14px"/>
```

### Ganti warna tema
Edit `:root` di `css/base.css`:
```css
:root {
  --orange: #e8461a;   ← Warna utama BNI
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
Tambahkan di mana saja dalam `<div id="deck">`.
Jangan lupa update menu di `#section-drawer`.

### Tambah kalkulator baru
1. Tambah fungsi di `js/calc.js`
2. Tambah HTML panel di slide kalkulator (slide 11)
3. Tambah tombol tab `.ctab` di header kalkulator

---

## Deploy ke GitHub Pages (Langkah demi Langkah)

### Pertama kali setup

1. **Buat akun GitHub** di github.com (gratis)

2. **Buat repository baru**
   - Klik tombol "+" → "New repository"
   - Nama: `bni-proposal` (atau nama lain)
   - Pilih: **Public**
   - Klik "Create repository"

3. **Upload files**
   - Di halaman repo, klik "uploading an existing file"
   - Drag & drop SEMUA file dan folder (`index.html`, `sw.js`, `manifest.json`, `config.json`, folder `css/`, `js/`, `icons/`)
   - Klik "Commit changes"

4. **Aktifkan GitHub Pages**
   - Klik tab **Settings** di repo
   - Klik **Pages** di sidebar kiri
   - Source: pilih **Deploy from a branch**
   - Branch: pilih **main** → folder **/ (root)**
   - Klik **Save**

5. **Tunggu 1–2 menit**, lalu URL proposal kamu:
   ```
   https://USERNAME.github.io/bni-proposal/
   ```

6. **Share URL ini ke tim** — mereka bisa langsung buka & install ke homescreen.

---

### Update konten (setelah setup)

1. Edit file yang perlu diubah (misal `config.json` atau `index.html`)
2. Di GitHub, buka file → klik ikon pensil ✏️ → edit → "Commit changes"
3. **Wajib**: Update `version` di `config.json` setiap deploy
   ```json
   "version": "1.2.1"
   ```
4. Update juga `CACHE_VERSION` di `sw.js`:
   ```js
   const CACHE_VERSION = 'bni-proposal-v1.2.1';
   ```
5. Tim yang sudah install akan otomatis dapat notifikasi update saat online.

---

## Install ke Homescreen

### Android (Chrome)
Buka URL → titik tiga pojok kanan → **"Add to Home screen"**

### iPhone/iPad (Safari)
Buka URL → tombol Share (kotak + panah bawah) → **"Add to Home Screen"**

Setelah install, app bisa dibuka offline kapan saja seperti aplikasi biasa.

---

## Fitur

- ✅ 14 slide (Cover, Ekosistem, 5x Lending, 2x BG, Trade, BNI Direct, Payroll, 2x Kalkulator, Closing)
- ✅ Working Capital Calculator (Cash Conversion Cycle analysis)
- ✅ 5 kalkulator kredit (KMK RK, Termloan/KI, SCF/SPAN, Bank Garansi, CCC)
- ✅ Presenter mode dengan catatan per slide
- ✅ Menu navigasi cepat (☰)
- ✅ PWA — installable, works offline
- ✅ Auto-update notification saat versi baru di-deploy
- ✅ Light theme paksa (tidak terpengaruh dark mode hape)
- ✅ Touch/swipe + keyboard navigation
- ✅ Cover inputs auto-sync ke slide penutup

---

*PT Bank Negara Indonesia (Persero) Tbk · v1.2.0*
