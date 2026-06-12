# Fetchr — Master State

> Single source of truth untuk proyek Fetchr. Update file ini bersamaan dengan setiap perubahan kode yang signifikan.

---

## Overview

Fetchr adalah GUI desktop modern untuk yt-dlp — memungkinkan pengguna mendownload video dari 1000+ situs (YouTube, TikTok, Instagram, Twitter, Twitch, dll.) dengan antarmuka yang bersih dan minimal.

- **Repo:** https://github.com/muhafif24/Fetchr
- **Platform:** Windows 10/11
- **Lisensi:** MIT

---

## Status

| Aspek | Status |
|---|---|
| Versi aktif | **1.5.0** |
| Stabilitas | Stabil — siap rilis |
| Dev mode | Berjalan via `FETCHR_DEV=1` + Vite (default port 5173, auto-5176 jika konflik) |
| Branch | `main` — up to date dengan origin |
| Last commit | `9a34fc5` feat: extension B-lite + bridge security hardening |

---

## Tech Stack

| Layer | Teknologi |
|---|---|
| Backend | Python 3.11+ + yt-dlp (pip dep) + PyWebview |
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS v4 + shadcn/ui |
| Notifications | plyer |
| Build | PyInstaller (onedir) + Inno Setup 6 |
| Extension | Manifest V3 (Chrome/Edge/Brave), MV3-Firefox |
| Komunikasi | PyWebview JS bridge + HTTP bridge (port 9099) |

---

## Arsitektur

```
gui/
├── app.py               <- PyWebview entry point, starts HTTP bridge
├── api.py               <- Semua Python functions callable dari JS (class Api)
├── downloader.py        <- yt-dlp wrapper — DownloadManager, pause/resume, notifications
├── extension_bridge.py  <- HTTP bridge server (port 9099) untuk browser extension
├── utils.py             <- check_ffmpeg, get_app_data_dir, get_extension_dir, dll
└── frontend_react/
    └── src/
        ├── App.tsx                      <- Root component + semua state utama
        ├── hooks/usePyApi.ts            <- Python <-> JS bridge + AppSettings type
        └── components/
            ├── TopBar.tsx               <- Horizontal nav (v1.5.0, menggantikan Sidebar)
            ├── Sidebar.tsx              <- DEPRECATED, tidak digunakan
            ├── VideoInfoCard.tsx
            ├── ActiveDownloads.tsx      <- pause/resume UI
            ├── FFmpegSetupModal.tsx     <- on-demand FFmpeg download
            ├── QueueSection.tsx
            ├── HistoryTable.tsx
            ├── SettingsPage.tsx         <- preferensi + browser extension section
            ├── PlaylistModal.tsx
            ├── DeleteModal.tsx          <- hapus 1 item history
            ├── ClearHistoryModal.tsx    <- hapus semua history (opsi hapus file disk)
            └── Toast.tsx                <- notifikasi non-blocking (pengganti alert())
```

### Pola Komunikasi

```
JS -> Python:    window.pywebview.api.function_name(args)
Python -> JS:    window.evaluate_js(f"if(window.fn){{window.fn({json.dumps(data)});}}")

Browser Extension -> Fetchr:
  POST http://127.0.0.1:9099/send-url
  Authorization: Bearer <token>
  --> extension_bridge.py --> api._on_bridge_url() --> evaluate_js("window.onReceiveUrl(...)")
```

**Aturan keamanan:** Semua data yang dikirim lewat `evaluate_js()` WAJIB di-wrap dengan `json.dumps()`.

### Event Callbacks (Python → JS)

| Event | Trigger |
|---|---|
| `window.updateDownloadProgress(payload)` | Tiap tick progress download |
| `window.onDownloadStarted(id, title)` | Saat metadata berhasil diambil |
| `window.onDownloadComplete(id, filename)` | Download + post-processing selesai |
| `window.onDownloadError(id, errorMsg)` | Download gagal |
| `window.onReceiveUrl(url)` | URL diterima dari browser extension |
| `window.onFfmpegProgress(percent, status)` | Progress unduhan FFmpeg on-demand |

### AppData Layout

```
%APPDATA%\Fetchr\
├── settings.json       <- preferensi user
├── history.json        <- riwayat download
├── bridge_token.txt    <- token auth browser extension (32-char hex)
├── bin\                <- ffmpeg.exe, ffprobe.exe (auto-downloaded)
└── extension\          <- file browser extension (disalin installer)
```

---

## Fitur

### Selesai (v1.4.0)

- Download video single (Best Quality / Audio MP3 / 4K / 1080p / 720p / 480p / 360p)
- Subtitle (embed ke video atau simpan sebagai .srt, 10+ bahasa)
- Playlist selector — pilih video spesifik dari playlist
- Batch queue — paste banyak URL, download semua sekaligus
- **Pause & Resume** — tombol di ActiveDownloads; `.part` file dipertahankan via `continuedl: True`; badge "Resuming" saat lanjut
- Real-time progress (speed, ETA, progress bar, phase)
- Download history (play, open folder, delete + hapus file fisik)
- **Windows notifications** — saat download selesai/gagal via `plyer`
- System tray — minimize ke tray, jalan di background
- Auto-update check via GitHub Releases API
- **Settings page** (General, Notifications, Advanced) — disimpan ke `settings.json`, diterapkan runtime tanpa restart
- **FFmpeg on-demand** — modal download ~90 MB ke AppData; tombol re-install di Settings
- **Browser Extension** — HTTP bridge port 9099, Bearer token, floating button, popup; Chrome/Edge/Brave/Firefox
- Migrasi otomatis history dari `%APPDATA%\yt-dlp-gui\` ke `%APPDATA%\Fetchr\`
- GitHub Actions CI (TypeScript + Python syntax check)
- GitHub Actions auto-update checker (PR otomatis saat yt-dlp rilis baru)
- **TopBar horizontal navigation** (v1.5.0) — brand | Download | Queue | History | Settings | dep warning | version
- **UI Redesign v1.5.0** — rose-500 + neutral palette, full-width layout, consistent empty states, sticky Settings save

### In Progress

_(kosong saat ini)_

### Planned

_(lihat `docs-local/` untuk detail)_

---

## Decision Log

| Tanggal | Keputusan | Alasan |
|---|---|---|
| 2026-05-01 | Pilih PyWebview sebagai desktop wrapper | Ringan, tidak perlu Electron, memanfaatkan WebView2 Windows bawaan |
| 2026-05-01 | React 19 + Tailwind v4 untuk frontend | Stack modern, DX baik, komponen shadcn/ui tersedia |
| 2026-05-26 | Download di thread terpisah | Agar UI tidak blocking saat download |
| 2026-06-10 | App.tsx dipecah menjadi 7+ komponen | File 1268 baris terlalu besar |
| 2026-06-10 | `evaluate_js()` wajib pakai `json.dumps()` | Fix XSS vulnerability yang ditemukan di v1.2.0 |
| 2026-06-10 | Pisah dari fork yt-dlp → repo Fetchr mandiri | Repo lebih bersih, yt-dlp jadi pip dependency |
| 2026-06-10 | FFmpeg on-demand ke `%APPDATA%\Fetchr\bin\` | Installer turun dari ~444 MB ke ~80 MB |
| 2026-06-10 | Pause via `_PauseDownload` exception | Thread berhenti bersih tanpa kill; `.part` file tetap ada untuk resume |
| 2026-06-10 | Browser extension tidak di git (`extension/` gitignored) | Tidak ingin extension open source; dibundle installer ke AppData |
| 2026-06-10 | HTTP bridge di `127.0.0.1:9099` + Bearer token | Extension perlu cara aman kirim URL ke desktop app; token 32-char hex di AppData |
| 2026-06-10 | WebView2 dihapus dari installer | Windows 10/11 sudah punya WebView2 pre-installed; file ~1.5 MB tidak perlu di-bundle |
| 2026-06-10 | Bump versi ke 1.4.0 | Semua fitur [Unreleased] di CHANGELOG sudah implemented dan committed |
| 2026-06-10 | Buat `version.py` sebagai single source of truth | Sebelumnya versi hardcoded di 3 tempat berbeda (api.py, extension_bridge.py, Sidebar.tsx) |
| 2026-06-10 | Settings masuk NAV utama Sidebar | Sebelumnya hanya ada sebagai tombol kecil tersembunyi di footer sidebar |
| 2026-06-10 | Bump versi ke 1.4.1 | Setelah serangkaian UX fix dari hasil audit |
| 2026-06-10 | UI Redesign penuh ke v1.5.0 (Minimal & Clean) | Topbar dihapus, palet rose-500 + neutral, Inter font, semua komponen didesain ulang visual |
| 2026-06-10 | Sidebar → TopBar horizontal | User: "tampilannya masih sama" — sidebar hanya ubah warna, bukan layout. TopBar beri konten lebih lebar dan look modern |
| 2026-06-10 | Queue format selector pindah ke bawah textarea | Sebelumnya float di pojok kanan header card — disconnected secara visual flow; sekarang inline dengan tombol Add |
| 2026-06-11 | History actions selalu terlihat + divider sebelum Delete | Hasil ux-audit: reveal-on-hover menurunkan discoverability; Play/Folder kini permanen, Delete dipisah divider agar tidak salah klik |
| 2026-06-11 | `ClearHistoryModal` menggantikan `window.confirm()` | Dialog native putih jarring & tak bertema; modal baru menyediakan opsi hapus file disk vs hapus history saja, konsisten dengan DeleteModal |
| 2026-06-11 | Extension B-lite (pilih format di popup) | Endpoint `/download` baru, route lewat `window.onReceiveDownload` agar reuse infra UI Queue (analisa tidak perlu — yt-dlp terima format selector langsung) |
| 2026-06-11 | Bridge di-hardening (Origin/Host/timing-safe) | Defense-in-depth: walau sudah loopback+token, tambahan tolak Origin web + anti DNS-rebind + compare_digest |
| 2026-06-11 | Firefox via XPI signed (web-ext sign, unlisted) | Install permanen; kredensial AMO di `docs-local/private/credentials-private.md`. Helper `extension/fetch-signed-xpi.py` untuk ambil XPI setelah Mozilla selesai signing |
| 2026-06-12 | `get_extension_dir()` prioritaskan repo di dev mode | Cek `sys.frozen` — dev pakai repo `extension/` terlebih dulu; frozen/installed pakai AppData. Mencegah folder AppData lama menyembunyikan file terbaru saat development |

---

## Known Issues

_(tidak ada saat ini)_

---

## CI / Automation

| Workflow | Trigger | Fungsi |
|---|---|---|
| `ci.yml` | Setiap push / PR ke `main` | Cek TypeScript (`tsc --noEmit`) + Python syntax |
| `check-ytdlp-update.yml` | Setiap Senin 09:00 WIB | Buat PR otomatis jika ada versi yt-dlp baru |

---

## Next Steps

- Tag release `v1.5.0` di GitHub
- Upload `Fetchr-setup.exe` ke GitHub Releases
- Firefox XPI v1.1.0 sudah signed ✅ (`extension/fetchr-companion-firefox.xpi`)

---

## Peta Dokumentasi

> Semua file docs yang ada di proyek ini, relasi antar dokumen, dan lokasinya.
> `docs/` = publik (di-push ke GitHub) · `docs-local/` = privat (gitignored)

### Dokumen Root

| File | Lokasi | Tujuan | Terkait |
|------|--------|--------|---------|
| [README.md](README.md) | root | Deskripsi publik + setup singkat | `docs/`, `CHANGELOG.md` |
| [CHANGELOG.md](CHANGELOG.md) | root | Riwayat perubahan per versi | `Fetchr - Master State.md` |
| [CONTRIBUTING.md](CONTRIBUTING.md) | root | Panduan kontribusi open source | `README.md`, `docs-local/setup/PANDUAN-FETCHR-OPENSOURCE.md` |
| [Fetchr - Master State.md](Fetchr%20-%20Master%20State.md) | root | **Single source of truth** proyek | Semua docs |

### docs/ — Publik

| File | Tujuan | Terkait |
|------|--------|---------|
| [logo-fetchr.png](docs/logo-fetchr.png) | Logo aplikasi untuk README | `README.md` |
| [fresh-install-testing.md](docs/fresh-install-testing.md) | Panduan simulasi fresh install + checklist verifikasi | `docs-local/testing/FUNCTIONAL-AUDIT-PLAN.md` |

### docs-local/setup/ — Panduan Dev & Build

| File | Tujuan | Terkait |
|------|--------|---------|
| [DEV-QUICKSTART.md](docs-local/setup/DEV-QUICKSTART.md) | Cara cepat jalankan app di dev mode | `docs-local/setup/BUILD-TUTORIAL.md` |
| [BUILD-TUTORIAL.md](docs-local/setup/BUILD-TUTORIAL.md) | Tutorial build PyInstaller + Inno Setup lengkap | `DEV-QUICKSTART.md`, `features/browser-extension.md` |
| [PANDUAN-FETCHR-OPENSOURCE.md](docs-local/setup/PANDUAN-FETCHR-OPENSOURCE.md) | Panduan open source: CI, lisensi, release | `README.md`, `CONTRIBUTING.md` |

### docs-local/features/ — Catatan Implementasi Fitur

| File | Tujuan | Terkait |
|------|--------|---------|
| [browser-extension.md](docs-local/features/browser-extension.md) | Arsitektur extension: bridge, token, manifest MV3 | `setup/BUILD-TUTORIAL.md`, `private/credentials-private.md` |
| [ffmpeg-on-demand.md](docs-local/features/ffmpeg-on-demand.md) | Unduh FFmpeg ke AppData saat pertama kali | `setup/BUILD-TUTORIAL.md` |
| [resume-download.md](docs-local/features/resume-download.md) | Pause & resume via `_PauseDownload` + `.part` file | `features/progress-detail.md` |
| [progress-detail.md](docs-local/features/progress-detail.md) | Progress real-time: speed, ETA, fase download | `features/resume-download.md` |
| [settings-page.md](docs-local/features/settings-page.md) | Rancangan halaman Settings + `settings.json` | — |
| [update-system.md](docs-local/features/update-system.md) | Auto-update via GitHub Releases API | — |
| [windows-notification.md](docs-local/features/windows-notification.md) | Notifikasi Windows via plyer | — |

### docs-local/testing/ — Pengujian

| File | Tujuan | Terkait |
|------|--------|---------|
| [FUNCTIONAL-AUDIT-PLAN.md](docs-local/testing/FUNCTIONAL-AUDIT-PLAN.md) | Checklist audit fungsional semua fitur v1.5.0 | `docs/fresh-install-testing.md` |

### docs-local/planning/ — Perencanaan

| File | Tujuan | Terkait |
|------|--------|---------|
| [roadmap.md](docs-local/planning/roadmap.md) | Status semua fitur (semua ✅ Done per v1.5.0) | `Fetchr - Master State.md` |

### docs-local/archive/ — Dokumen Selesai

| File | Tujuan | Status |
|------|--------|--------|
| [UI-Redesign-Plan.md](docs-local/archive/UI-Redesign-Plan.md) | Rencana redesign visual v1.5.0 | ✅ Diimplementasikan di v1.5.0 |
| [REMINDER-firefox-xpi-signing.md](docs-local/archive/REMINDER-firefox-xpi-signing.md) | Proses signing Firefox XPI v1.1.0 | ✅ Selesai 2026-06-11 |

### docs-local/private/ — Privat

| File | Tujuan | Terkait |
|------|--------|---------|
| [credentials-private.md](docs-local/private/credentials-private.md) | JWT issuer/secret Mozilla AMO untuk re-sign extension Firefox | `features/browser-extension.md` |

---

## References

- Repo: https://github.com/muhafif24/Fetchr
- yt-dlp: https://github.com/yt-dlp/yt-dlp
- PyWebview: https://pywebview.flowrl.com/
- Tailwind CSS v4: https://tailwindcss.com/docs
- shadcn/ui: https://ui.shadcn.com/
- web-ext: https://extensionworkshop.com/documentation/develop/web-ext-command-reference/
- CHANGELOG: [CHANGELOG.md](CHANGELOG.md)
- Contributing: [CONTRIBUTING.md](CONTRIBUTING.md)
- Build tutorial: [docs-local/BUILD-TUTORIAL.md](docs-local/BUILD-TUTORIAL.md)
