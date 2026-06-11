# Changelog

All notable changes to Fetchr will be documented here.

## [Unreleased]

## [1.5.0] — 2026-06-10

### Changed — UI Redesign (TopBar + Layout Baru)
- **Sidebar dihapus**, diganti **TopBar horizontal** — navigasi sejajar di atas konten; menghemat ~200px lebar
- **Konten full-width** `max-w-3xl` centered dengan padding konsisten, bukan kolom sempit di samping sidebar
- **Palet warna baru**: `#0a0a0a` app bg · `#141414` card/surface · `#242424` border · `#f43f5e` rose-500 sebagai aksen utama, menggantikan zinc + violet
- **Font Inter** diinstall via `@fontsource-variable/inter`, konsisten di semua mesin tanpa bergantung font sistem
- **TopBar**: brand (logo + "Fetchr") | tabs (icon+label) | `⚠ FFmpeg missing` contextual warning | update banner | versi `v1.5.0`
- **Tab active indicator**: underline rose-500 di bawah tab aktif, latar `bg-neutral-800/40`
- **Empty states** Download + History: bordered card `rounded-xl border border-[#242424] bg-[#0d0d0d]` menggantikan konten melayang di tengah void hitam
- **Queue — format selector**: dipindah dari pojok kanan card header ke bawah textarea, sebaris dengan tombol "Add to Queue" — lebih logis secara flow
- **Settings — Save button**: sticky `fixed bottom-0` dengan backdrop-blur, tidak lagi terkubur di bawah scroll
- **Settings — section headers**: kontras dinaikkan `text-neutral-600` → `text-neutral-500` agar lebih terbaca
- **VideoInfoCard**: thumbnail `w-44`, tombol "Start Download" rose-500, label minimal tanpa uppercase tracking
- **ActiveDownloads**: progress bar selesai emerald (bukan violet), status `text-emerald-400`
- **HistoryTable**: pseudo-tabel dengan kolom Date + Format + Actions, row hover `bg-[#1a1a1a]`
  - Format ditampilkan sebagai **badge ringkas** (4K, 1080p, MP3, Auto) — label panjang tetap di tooltip
  - **Relative date**: "Today" / "Yesterday" / "Mon" / "Jun 10" menggantikan timestamp ISO mentah
  - Aksi **Play + Open Folder selalu terlihat**, dipisah **divider** dari tombol Delete agar tidak salah klik
  - Tombol **Clear All** (merah, dengan ikon) di atas tabel
- **Clear All History modal** (`ClearHistoryModal`) — bertema gelap konsisten, dengan opsi **"Also delete the video files from your computer"**: hapus history saja atau sekalian hapus file dari disk; menampilkan peringatan saat opsi disk aktif; menggantikan `window.confirm()` native yang putih/jarring
- **Themed toast** (`Toast` + `ToastContainer`) — notifikasi non-blocking pojok kanan-bawah, auto-dismiss 4s + progress bar, ikon per jenis (error/success/info); menggantikan **semua `alert()` native** yang memblokir UI & keluar dari tema
- **Modals** (FFmpegSetup, Delete, Playlist, ClearHistory): bg `#141414`, border `#242424`, overlay `bg-black/75` — semua diselaraskan; violet → rose-500
- **Versi fallback**: `v1.5.0` tampil di dev mode (tidak perlu PyWebview)

## [1.4.1] — 2026-06-10

### Fixed
- Folder lama `%APPDATA%\yt-dlp-gui\` kini dihapus otomatis setelah migrasi history selesai
- Versi app di sidebar tidak lagi hardcoded — diambil langsung dari Python (`version.py`)
- `extension_bridge.py` sebelumnya menampilkan versi `1.3.0` yang salah, kini sinkron otomatis
- Duplikat field "Save to" di tab Download dihapus
- Concurrent downloads sekarang benar-benar dihormati — queue tidak lagi membuka semua slot sekaligus; download berikutnya auto-start saat slot tersedia
- Tombol aksi (Play, Buka Folder, Hapus) di History kini selalu terlihat, tidak perlu hover
- Status download setelah selesai menampilkan "Download complete", bukan "Merging with FFmpeg..."
- Header halaman menjadi judul sederhana, menggantikan breadcrumb `Fetchr / Download` yang menyesatkan
- Setelah klik "Start Download", user tetap di tab Download untuk memudahkan download URL berikutnya

### Changed
- Settings dipindah ke navigasi utama Sidebar (sejajar Download / Queue / History)
- Label sumber FFmpeg di sidebar diperhalus: path teknis diganti dengan `AppData`, `Bundled`, atau `System`
- Indikator "Playlist detected" muncul di bawah input URL saat URL terdeteksi sebagai playlist
- Pemisah visual "Single Downloads" ditambahkan di tab Queue untuk membedakan download standalone vs queue
- Semua teks hint/keterangan dinaikkan kontrasnya dari `zinc-700/600` → `zinc-500` agar lebih mudah dibaca
- Font label di VideoInfoCard dinaikkan dari 11px ke 12px
- Warna card Active Downloads diselaraskan ke zinc palette (sebelumnya kebiruan)

## [1.4.0] — 2026-06-10

### Added
- **Settings page** — tab baru di Sidebar untuk mengatur preferensi download
  - General: folder default, format default, bahasa subtitle, embed subs otomatis, start minimized
  - Notifications: toggle on/off notifikasi selesai dan gagal
  - Advanced: concurrent downloads (1–5), rate limit, proxy, cookie file
  - Dependencies: tombol Install / Re-install FFmpeg
  - Browser Extension: token display, copy, regenerate, panduan instalasi Chrome/Firefox
- **Pause & Resume downloads** — tombol Pause dan Resume di active downloads card; `.part` file dipertahankan saat pause; badge "Resuming" ditampilkan saat melanjutkan
- **Browser Extension companion** — HTTP bridge di port 9099; Bearer token auth; floating button di YouTube/TikTok/dll; popup UI; mendukung Chrome, Edge, Brave, Opera, Firefox
- **FFmpeg on-demand** — modal setup otomatis saat FFmpeg tidak terdeteksi; download ~90 MB ke `%APPDATA%\Fetchr\bin\`; tombol re-install tersedia di Settings setelah modal diabaikan
- **Windows notifications** — notifikasi saat download selesai dan saat download gagal (via `plyer`)
- **AppData migration** — history.json dari `%APPDATA%\yt-dlp-gui\` otomatis disalin ke `%APPDATA%\Fetchr\`
- GitHub Actions CI — TypeScript + Python syntax check pada setiap push
- GitHub Actions auto-update — buat PR otomatis setiap yt-dlp rilis versi baru

### Changed
- yt-dlp dijadikan pip dependency (`yt-dlp>=2026.06.09`), bukan bundled fork
- Installer tidak lagi menyertakan WebView2 (sudah pre-installed di Windows 10/11)
- Installer menyertakan folder `extension/` ke `%APPDATA%\Fetchr\extension\`
- URL input placeholder dibuat platform-agnostic
- Settings disimpan ke `%APPDATA%\Fetchr\settings.json` dan diterapkan ke runtime tanpa restart

---

## [1.3.0] — 2026-06-10

### Added
- Sidebar navigation layout (Download / Queue / History tabs)
- Breadcrumb top bar with contextual hints
- Empty states with Fetchr logo

### Changed
- App.tsx split from 1268 lines into 7 focused components:
  `Sidebar`, `VideoInfoCard`, `ActiveDownloads`, `QueueSection`,
  `HistoryTable`, `DeleteModal`, `PlaylistModal`
- UI redesigned: dark elegant palette (zinc + violet accent)
- Analyze button moved inline with URL input

### Fixed
- XSS vulnerability in `evaluate_js()` calls — now uses `json.dumps()`
- `DEV_MODE` was hardcoded `True` — now reads `FETCHR_DEV` env var
- Vite dev server port corrected to 5175

## [1.2.0] — 2026-05-26

### Added
- Download queue (batch URLs)
- Playlist support with item selector
- Subtitle download (embed or .srt)
- System tray with minimize support
- 4K format option
- Auto-update check via GitHub API
- Download history with play / open folder / delete

## [1.0.0] — 2026-05-01

### Added
- Initial release
- Basic YouTube video download
- Format selector (Best, Audio, 1080p, 720p)
- Output folder picker
- Real-time progress bar
- React 19 + Tailwind v4 frontend
- PyWebview desktop wrapper
- PyInstaller build + Inno Setup installer
