# Fetchr — Master State

> Single source of truth untuk proyek Fetchr. Update file ini bersamaan dengan setiap perubahan kode yang signifikan.

---

## Overview

Fetchr adalah GUI desktop modern untuk yt-dlp — memungkinkan pengguna mendownload video dari 1000+ situs (YouTube, TikTok, Instagram, Twitter, Twitch, dll.) dengan antarmuka yang bersih dan minimal.

- **Repo:** https://github.com/muhafif24/Fetchr
- **Platform:** Windows 10/11 (WebView2 required)
- **Lisensi:** MIT

---

## Status

| Aspek | Status |
|---|---|
| Versi aktif | **1.3.0** |
| Stabilitas | Stabil — siap rilis |
| Dev mode | Berjalan via `FETCHR_DEV=1` + Vite port 5175 |

---

## Tech Stack

| Layer | Teknologi |
|---|---|
| Backend | Python 3.x + yt-dlp + PyWebview |
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS v4 + Shadcn/ui |
| Build | PyInstaller (exe) + Inno Setup (installer) |
| Komunikasi | PyWebview JS bridge (`window.pywebview.api.*`) |

---

## Arsitektur

```
gui/
├── app.py          ← PyWebview window entry point
├── api.py          ← Semua Python functions callable dari JS (class Api)
├── downloader.py   ← yt-dlp wrapper — DownloadManager + progress hooks
├── utils.py        ← check_ffmpeg, check_js_runtime, format_size, format_duration
└── frontend_react/
    └── src/
        ├── App.tsx                   ← Root component + state management utama
        ├── hooks/usePyApi.ts         ← Python ↔ JS bridge hook
        └── components/
            ├── Sidebar.tsx
            ├── VideoInfoCard.tsx
            ├── ActiveDownloads.tsx
            ├── QueueSection.tsx
            ├── HistoryTable.tsx
            ├── PlaylistModal.tsx
            └── DeleteModal.tsx
```

### Pola Komunikasi

```
JS → Python:   window.pywebview.api.function_name(args)
Python → JS:   window.evaluate_js("if (window.fn) { window.fn(json.dumps(data)); }")
```

**Aturan keamanan:** Semua data yang dikirim lewat `evaluate_js()` WAJIB di-wrap dengan `json.dumps()` — mencegah XSS injection.

### Event Callbacks (Python → JS)

| Event | Trigger |
|---|---|
| `window.updateDownloadProgress(payload)` | Tiap tick progress download |
| `window.onDownloadStarted(id, title)` | Saat metadata video berhasil diambil |
| `window.onDownloadComplete(id, filename)` | Download + post-processing selesai |
| `window.onDownloadError(id, errorMsg)` | Download gagal atau dibatalkan |

---

## Fitur

### ✅ Selesai

- Download video single (Best Quality / Audio MP3 / 4K / 1080p / 720p / 480p / 360p)
- Subtitle (embed ke video atau simpan sebagai .srt)
- Playlist selector — pilih video spesifik dari playlist
- Batch queue — paste banyak URL, download semua sekaligus
- Real-time download progress (speed, ETA, progress bar, phase)
- Download history (play, open folder, delete + hapus file fisik)
- System tray — minimize ke tray, jalan di background
- Auto-update check via GitHub Releases API
- Sidebar navigation (Download / Queue / History)
- Dark elegant UI (zinc + violet accent)
- Windows notification saat download selesai / gagal (via `plyer`, graceful fallback jika belum install)
- Migrasi otomatis history dari `%APPDATA%\yt-dlp-gui\` → `%APPDATA%\Fetchr\`
- Settings page (tab di Sidebar) — General, Notifications, Advanced; disimpan ke `%APPDATA%\Fetchr\settings.json`
- FFmpeg on-demand — modal setup saat FFmpeg tidak ada, download ~90 MB ke `%APPDATA%\Fetchr\bin\`, progress real-time
- Resume download — tombol Pause/Resume di ActiveDownloads; `.part` file dipertahankan via `continuedl: True`; badge "Resuming" saat lanjut dari file sebelumnya

### 🔄 In Progress

_(kosong saat ini)_

### 📋 Planned

Detail implementasi setiap fitur ada di `docs-local/`.

| Prioritas | Fitur | File |
|-----------|-------|------|
| 🟢 Long | Browser extension companion | `docs-local/browser-extension.md` |

---

## Decision Log

| Tanggal | Keputusan | Alasan |
|---|---|---|
| 2026-05-01 | Pilih PyWebview sebagai desktop wrapper | Ringan, tidak perlu Electron, memanfaatkan WebView2 Windows bawaan |
| 2026-05-01 | React 19 + Tailwind v4 untuk frontend | Stack modern, DX baik, komponen Shadcn/ui tersedia |
| 2026-05-26 | Download berjalan di thread terpisah (`threading.Thread`) | Agar UI tidak blocking saat download berlangsung |
| 2026-06-10 | App.tsx dipecah menjadi 7 komponen terpisah | File 1268 baris terlalu besar, susah di-maintain |
| 2026-06-10 | Semua `evaluate_js()` wajib pakai `json.dumps()` | Fix XSS vulnerability yang ditemukan di v1.2.0 |
| 2026-06-10 | Fix `APP_VERSION` → `"1.3.0"` dan `GITHUB_REPO` → `"muhafif24/Fetchr"` | Sync dengan CHANGELOG + repo URL yang benar |
| 2026-06-10 | Pisah dari fork yt-dlp → repo Fetchr mandiri | Repo lebih bersih, yt-dlp jadi dependency pip bukan kode yang di-bundle |
| 2026-06-10 | yt-dlp sebagai pip dependency (`yt-dlp>=2026.06.09`) | Update engine cukup 1 baris di requirements.txt, tidak perlu merge upstream manual |
| 2026-06-10 | URL input dibuat platform-agnostic | yt-dlp sudah support 1000+ platform otomatis, placeholder sebelumnya hanya sebut YouTube |
| 2026-06-10 | Tambah GitHub Actions CI + auto-update checker | CI cek TypeScript & Python syntax tiap push; checker buat PR otomatis tiap yt-dlp rilis versi baru |
| 2026-06-10 | Fix AppData path `yt-dlp-gui` → `Fetchr` + migration script | Sisa nama lama dari saat project masih fork; migration salin history lama sekali saat app dibuka |
| 2026-06-10 | Windows notification via `plyer` dengan graceful fallback | Notif muncul di pojok kanan bawah Windows saat download selesai/gagal; app tidak crash jika plyer belum terinstall |
| 2026-06-10 | Settings page — simpan ke `%APPDATA%\Fetchr\settings.json` | Fondasi untuk semua preferensi user; concurrent semaphore, rate limit, proxy, dan cookie file diterapkan ke ydl_opts tanpa restart |
| 2026-06-10 | FFmpeg on-demand — download ke `%APPDATA%\Fetchr\bin\` | Menghilangkan FFmpeg dari bundle; installer turun dari ~444 MB ke ~80 MB; `check_ffmpeg()` cek appdata pertama |
| 2026-06-10 | Resume download via Pause/Resume buttons | Bedakan Cancel (hapus .part) vs Pause (simpan .part); `continuedl: True` di ydl_opts; `_PauseDownload` exception agar thread berhenti bersih |

---

## Known Issues

- `%APPDATA%\yt-dlp-gui\` (folder lama) tidak dihapus otomatis setelah migrasi — biarkan user hapus manual jika perlu

---

## CI / Automation

| Workflow | Trigger | Fungsi |
|---|---|---|
| `ci.yml` | Setiap push / PR ke `main` | Cek TypeScript (`tsc --noEmit`) + Python syntax |
| `check-ytdlp-update.yml` | Setiap Senin 09:00 WIB | Buat PR otomatis jika ada versi yt-dlp baru |

---

## Next Steps

Urutan fitur yang disarankan (lihat `docs-local/` untuk detail implementasi):

1. **Browser extension** — Python HTTP bridge di port 9099 + Chrome/Edge extension (~2-3 hari)

---

## References

- Repo: https://github.com/muhafif24/Fetchr
- yt-dlp docs: https://github.com/yt-dlp/yt-dlp
- PyWebview docs: https://pywebview.flowrl.com/
- Tailwind CSS v4: https://tailwindcss.com/docs
- Shadcn/ui: https://ui.shadcn.com/
- CHANGELOG: [CHANGELOG.md](CHANGELOG.md)
- Contributing guide: [CONTRIBUTING.md](CONTRIBUTING.md)
