# Fetchr — Rencana UI Redesign (Tahap 2)

> Dokumen perencanaan lengkap untuk rombak visual Fetchr v1.5.0.
> Dibuat setelah audit UX Tahap 1 (v1.4.1).
> Terakhir diupdate: 2026-06-10

---

## Keputusan Desain (Final)

| Aspek | Keputusan |
|-------|-----------|
| Skala perubahan | **Redesign penuh** — layout, navigasi, warna berubah menyeluruh |
| Tone visual | **Minimal & Clean** — whitespace banyak, tipografi dominan |
| Background | `#0a0a0a` (neutral near-black) |
| Card / Surface | `#141414` solid (tidak pakai opacity) |
| Border | `#242424` |
| Warna aksen | **Rose-500** `#f43f5e` |
| Sidebar | **Opsi B** — labeled narrow `w-48`, active = border kiri rose |
| Topbar | **Dihapus** — judul pindah ke atas konten per halaman |
| Font | **Inter** — via npm, konsisten di semua mesin |
| Icon library | **ItsHover** (animated hover) + Lucide fallback |
| Animasi | **transitions.dev** (copy-paste) + **Motion.dev** |
| Komponen | **21st.dev** untuk progress bar, spinner, alert |

---

## Resource yang Digunakan

### 1. transitions.dev
Copy-paste transitions untuk React/CSS. Tidak perlu install library, langsung pakai kodenya.

**Yang akan dipakai di Fetchr:**

| Transisi | Dipakai di mana |
|----------|-----------------|
| `Skeleton loader and reveal` | Saat URL sedang dianalisis (ganti spinner button) |
| `Card resize` | VideoInfoCard muncul/hilang setelah analisis |
| `Tabs sliding` | Indikator aktif di sidebar navigation |
| `Modal open/close` | FFmpegSetupModal, PlaylistModal, DeleteModal |
| `Number pop-in` | Angka persentase di progress download |
| `Text states swap` | Status teks di ActiveDownloads (Downloading → Complete → Error) |
| `Success check` | Animasi saat download selesai |
| `Error state shake` | Input URL saat analisis gagal |
| `Shimmer text` | Teks "Analyzing..." saat fetch video info |
| `Notification badge` | Badge angka di Queue di sidebar |
| `Tooltip open/close` | Tooltip status system di sidebar footer |
| `Icon swap` | Tombol download berubah state (idle → loading → done) |

---

### 2. ItsHover Icons (itshover.com/icons)
Animated hover icons, dibangun dengan Motion.dev. Kompatibel dengan shadcn/ui.
Install per icon: `npx shadcn@latest add https://itshover.com/r/<icon-name>.json`

**Icon yang akan diganti dari Lucide ke ItsHover:**

| Lokasi | Icon Lucide saat ini | ItsHover pengganti |
|--------|---------------------|-------------------|
| Sidebar — Download tab | `Download` | `Download` |
| Sidebar — History tab | `Clock` | `History Circle` |
| Sidebar — Settings tab | `Settings` | `Gear` |
| History — Play button | `Play` (lucide) | `Player` |
| History — Delete button | `Trash2` | `Trash` |
| Settings — Copy token | `Copy` | `Copy` |
| Settings — Regenerate token | `RefreshCw` | `Refresh` |
| Download — URL input icon | `Link` | `Link` |
| Global — Close/dismiss | `X` | `X` |
| Settings — External link | `ExternalLink` | `External Link` |
| ActiveDownloads — Cancel | `X` | `X` |

**Icon yang tetap pakai Lucide** (tidak ada di ItsHover):
- `Pause`, `ListVideo`, `FolderOpen`, `AlertCircle`, `CheckCircle`, `ChevronDown`, `Puzzle`, `Cpu`

> **Cara install:** Karena ItsHover terintegrasi dengan shadcn CLI, install satu per satu
> saat implementasi per komponen. Semua di-output ke `components/icons/`.

---

### 3. 21st.dev Community Components
400+ komponen komunitas berbasis React + Tailwind. Copy-paste langsung.

**Komponen yang akan digunakan:**

| Komponen 21st.dev | Dipakai di mana | Alasan |
|-------------------|-----------------|--------|
| **Progress bar** (kategori Sliders/Progress) | ActiveDownloads, QueueSection | Lebih expressive dari shadcn default |
| **Spinner loader** (kategori Spinner Loaders) | Saat analyzing URL | Lebih elegan dari RefreshCw spin |
| **Alert** (kategori Alerts) | Error analisis URL, error download | Lebih polished dari shadcn Alert |
| **File download card** (kategori File Downloads) | ActiveDownloads item card | Referensi layout |
| **Modal/Dialog** (37 komponen) | PlaylistModal, DeleteModal | Animasi open/close lebih smooth |

> **Cara pakai:** Buka 21st.dev, pilih komponen, copy kode, sesuaikan warna ke sistem rose/neutral.

---

## Sistem Warna Baru

```
── Background Layers ─────────────────────────────────────
  App background   : #0a0a0a
  Sidebar bg       : #0f0f0f
  Surface / Card   : #141414
  Surface hover    : #1a1a1a
  Border default   : #242424
  Border subtle    : #1e1e1e

── Text Hierarchy ────────────────────────────────────────
  Primer           : #f5f5f5  (neutral-100)
  Sekunder         : #a3a3a3  (neutral-400)
  Muted            : #737373  (neutral-500)
  Sangat muted     : #525252  (neutral-600)

── Aksen Utama — Rose ────────────────────────────────────
  Primer           : #f43f5e  (rose-500)
  Hover            : #e11d48  (rose-600)
  Bg muted         : rgba(244,63,94,0.08)
  Border muted     : rgba(244,63,94,0.20)

── State Colors ──────────────────────────────────────────
  Success          : #22c55e  (green-500)
  Error            : #ef4444  (red-500)
  Warning / Pause  : #f59e0b  (amber-500)
  Info             : #3b82f6  (blue-500)
```

---

## Perubahan Layout

### Topbar
**Dihapus sepenuhnya.** Judul halaman dipindah sebagai `<h1>` di atas konten.
Hint text (misal "Press Enter to analyze") dipindah di bawah judul sebagai subtitle kecil.
Efek: konten dapat ~48px ruang tambahan.

### Sidebar
```
Sebelum  →  Sesudah
─────────────────────────────────────────
w-52          w-48
Active: bg-zinc-800 rounded  →  border-l-2 rose-500, bg transparent
Hover:  hover:bg-zinc-900    →  text-neutral-300 saja (no bg)
Brand:  Logo + "Fetchr"      →  sama, hapus subtitle "Downloader"
        "Downloader"
Footer: System dots + versi  →  sama, font sedikit lebih terang
Badge:  violet-500/20        →  rose-500/10 text-rose-400
```

### Content Area
```
Sebelum: p-6, max-w-2xl, space-y-5
Sesudah: p-8, max-w-2xl, space-y-6
```

---

## Rencana Perubahan Per Komponen

### Step 1 — Fondasi: Font + Token Warna
**File:** `index.html`, `tailwind.config`, `globals.css`
- [ ] Install font Inter via npm (`@fontsource/inter`)
- [ ] Import Inter di `globals.css`
- [ ] Tambah custom color tokens di `tailwind.config.ts`
- [ ] Test font muncul di seluruh app

---

### Step 2 — App.tsx + Sidebar (Kerangka Utama)
**File:** `App.tsx`, `Sidebar.tsx`

**App.tsx:**
- [ ] Hapus `<header>` topbar sepenuhnya
- [ ] Ganti `bg-[#09090b]` → `bg-[#0a0a0a]`
- [ ] Ganti `border-zinc-800/50` → `border-[#242424]`
- [ ] Tambah heading + subtitle per tab di dalam `<main>`
- [ ] Pasang transisi `Card resize` (transitions.dev) pada VideoInfoCard mount/unmount
- [ ] Pasang transisi `Error state shake` pada error analisis URL

**Sidebar.tsx:**
- [ ] Ubah `w-52` → `w-48`
- [ ] Hapus subtitle "Downloader"
- [ ] Ganti active state: `border-l-2 border-rose-500 text-white bg-transparent pl-[10px]`
- [ ] Ganti hover: `text-neutral-300` saja
- [ ] Ganti badge: `bg-rose-500/10 text-rose-400`
- [ ] Install & pakai ItsHover icons: `Download`, `History Circle`, `Gear`
- [ ] Pasang transisi `Notification badge` (transitions.dev) pada badge angka
- [ ] Pasang transisi `Tabs sliding` pada indikator aktif
- [ ] Warna version text: `#525252`

---

### Step 3 — Download Tab
**File:** `App.tsx` (section download), `VideoInfoCard.tsx`

**URL Input area:**
- [ ] Ganti tombol Analyze: `bg-rose-500 hover:bg-rose-600`
- [ ] Ganti tombol Load Playlist: outline rose
- [ ] Ganti ItsHover icon `Link` di dalam input
- [ ] Ganti spinner button → `Skeleton loader and reveal` (transitions.dev) saat analyzing
- [ ] Pasang `Shimmer text` pada teks "Analyzing..." (transitions.dev)
- [ ] Pasang `Error state shake` saat error muncul

**Empty state:**
- [ ] Icon lebih besar (w-16 h-16), opacity naik ke 50%
- [ ] Teks lebih friendly dan besar
- [ ] Teks reveal animation (transitions.dev)

**VideoInfoCard:**
- [ ] Background: `bg-[#141414]` solid, border `border-[#242424]`
- [ ] Thumbnail lebih besar: `w-44`
- [ ] Tombol "Start Download": `bg-rose-500 hover:bg-rose-600`
- [ ] ItsHover icon `Download` di tombol start
- [ ] Label format: hapus `uppercase tracking-wider`, ganti ke `text-xs text-neutral-400`
- [ ] Subtitle checkbox → toggle custom (konsisten dengan Settings)
- [ ] Pasang `Card resize` (transitions.dev) saat card mount

---

### Step 4 — Queue Tab
**File:** `QueueSection.tsx`, `ActiveDownloads.tsx`

**QueueSection:**
- [ ] Textarea: border `border-[#242424]`, focus ring rose
- [ ] Queue item: compact, divider bawah tipis, bukan card per item
- [ ] Tombol "Download N pending": `bg-rose-500 hover:bg-rose-600`
- [ ] Progress bar: ganti dengan komponen dari **21st.dev**
- [ ] Status teks: `Text states swap` (transitions.dev)
- [ ] Empty state lebih elegan

**ActiveDownloads:**
- [ ] Card: `bg-[#141414]` border `border-[#242424]`
- [ ] Progress bar: komponen **21st.dev**, warna rose saat aktif
- [ ] Angka persentase: `Number pop-in` (transitions.dev)
- [ ] Status teks: `Text states swap` (transitions.dev)
- [ ] Status "selesai": `Success check` (transitions.dev)
- [ ] ItsHover icons: `X` untuk cancel/dismiss
- [ ] Tombol Pause/Resume: tetap lucide (tidak tersedia di ItsHover)

---

### Step 5 — History Tab
**File:** `HistoryTable.tsx`

- [ ] Layout ulang jadi pseudo-tabel:
  ```
  [Tanggal] [Judul video (flex)]  [Format]  [▶ 📁 🗑]
  ```
- [ ] Row hover: `bg-[#141414]`
- [ ] Garis pemisah baris: `border-b border-[#1e1e1e]`
- [ ] ItsHover icons: `Player`, `Trash`, `History Circle`
- [ ] Empty state: icon dan teks lebih besar
- [ ] Alert dari **21st.dev** jika ada error saat play/open folder

---

### Step 6 — Settings Tab
**File:** `SettingsPage.tsx`

- [ ] Section card: `bg-[#141414]` solid, border `border-[#242424]`
- [ ] Section label: `text-xs font-semibold text-neutral-500 uppercase`
- [ ] Toggle redesign: lebih besar (w-10 h-6), thumb lebih besar, warna rose saat aktif
- [ ] ItsHover icons: `Copy`, `Refresh`, `Gear`
- [ ] Tombol Save: `bg-rose-500 hover:bg-rose-600`
- [ ] Feedback "Saved": `Success check` (transitions.dev)
- [ ] FFmpeg status: badge lebih clean dengan icon `CPU` (lucide)

---

### Step 7 — Modals
**File:** `FFmpegSetupModal.tsx`, `PlaylistModal.tsx`, `DeleteModal.tsx`

**Semua modal:**
- [ ] Backdrop: `bg-black/75`
- [ ] Card: `bg-[#141414]` border `border-[#242424]` shadow besar
- [ ] Animasi open/close: `Modal open/close` (transitions.dev) — scale + fade
- [ ] Atau pakai Dialog dari **21st.dev** yang sudah ada animasinya

**FFmpegSetupModal:**
- [ ] Progress bar: komponen **21st.dev**, warna rose
- [ ] Tombol download: rose

**DeleteModal:**
- [ ] Tombol confirm: tetap `red-500` (aksi destruktif)
- [ ] Tombol cancel: outline neutral

---

### Step 8 — Polish & Final Check
- [ ] TypeScript check: `npx tsc --noEmit`
- [ ] Review visual consistency seluruh app
- [ ] Pastikan tidak ada sisa `violet-` atau `zinc-` yang tidak konsisten
- [ ] Update `version.py` ke `1.5.0`
- [ ] Update `CHANGELOG.md`
- [ ] Update `Master State.md`
- [ ] Commit

---

## Urutan Eksekusi & Estimasi

```
Step 1  Fondasi font + token         ~30 menit
Step 2  App.tsx + Sidebar            ~60 menit
Step 3  Download tab                 ~45 menit
Step 4  Queue tab                    ~45 menit
Step 5  History tab                  ~30 menit
Step 6  Settings tab                 ~60 menit
Step 7  Modals                       ~30 menit
Step 8  Polish + release             ~30 menit
─────────────────────────────────────────────
Total estimasi                       ~5–6 jam
```

---

## Yang TIDAK Berubah

- Semua logika Python (`api.py`, `downloader.py`, `extension_bridge.py`, dll.)
- Semua state management dan callback di `App.tsx`
- Semua fungsi download, pause, resume, queue, history
- Browser extension
- Build pipeline (PyInstaller + Inno Setup)

---

## Referensi Visual

| App | Apa yang diadopsi |
|-----|-------------------|
| **Linear** | Sidebar minimal, border-left active state |
| **Vercel Dashboard** | Dark, banyak whitespace, tipografi bersih |
| **Raycast** | Compact tapi premium, transisi smooth |

---

*Dibuat: 2026-06-10 | Target versi: v1.5.0*
