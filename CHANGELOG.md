# Changelog

All notable changes to Fetchr will be documented here.

## [Unreleased]

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
