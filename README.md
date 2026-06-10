# Fetchr

Modern desktop GUI for yt-dlp — download videos from 1000+ sites with a clean, minimal interface.

![Fetchr Screenshot](docs/screenshot-download.png)

## Features

- Download videos from **YouTube, TikTok, Instagram, Twitter, Twitch**, and 1000+ other sites
- Choose format: Best Quality, Audio Only (MP3), 1080p, 720p, 480p, 360p, 4K
- Download subtitles — embedded in video or separate .srt file (10+ languages)
- Playlist support — pick specific videos from a playlist
- Batch queue — paste multiple URLs, download all at once
- **Pause & Resume** downloads — paused downloads preserve progress via `.part` files
- Real-time download progress with speed and ETA
- Download history with quick access (play, open folder, delete)
- **Windows notifications** — notified on completion and errors
- **Settings page** — default folder, format, subtitle language, concurrent downloads, proxy, cookie file
- **FFmpeg auto-download** — Fetchr installs FFmpeg automatically if not found (~90 MB into AppData)
- **Browser Extension** — send any video URL to Fetchr with one click (Chrome, Edge, Brave, Firefox)
- System tray — minimize to tray, runs in background
- Auto-update notifications
- Dark elegant UI

## Download

Go to [Releases](../../releases) and download the latest `Fetchr-setup.exe`.

> **Requirements:** Windows 10 or Windows 11.

## Browser Extension

Fetchr ships with a companion browser extension that lets you send any video URL to Fetchr with one click — no copy-pasting.

The extension is bundled with the installer into `%APPDATA%\Fetchr\extension\`.  
After installing Fetchr, go to **Settings → Browser Extension** for step-by-step setup instructions.

Supported browsers: Chrome, Edge, Brave, Opera, Firefox.

## Legal Disclaimer

Fetchr is a tool for downloading media. Please use it only for:
- Content you own the rights to
- Content under Creative Commons or open licenses
- Content that explicitly permits downloading

Users are solely responsible for compliance with the Terms of Service of each platform and applicable copyright law. The developer is not responsible for misuse of this tool.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11+, [yt-dlp](https://github.com/yt-dlp/yt-dlp), PyWebview |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, shadcn/ui |
| Notifications | plyer |
| Build | PyInstaller (onedir), Inno Setup 6 |
| Extension | Manifest V3 (Chrome/Edge/Brave), MV3-Firefox (Firefox) |

## Development Setup

**Prerequisites:** Python 3.11+, Node.js 18+, Git

```powershell
# Clone repo
git clone https://github.com/muhafif24/Fetchr.git
cd Fetchr

# Python virtual environment
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Frontend dependencies
cd gui/frontend_react
npm install
cd ../..
```

### Run in Dev Mode

```powershell
# Terminal 1 — React frontend (hot reload on http://localhost:5175)
cd gui/frontend_react
npm run dev

# Terminal 2 — Python backend
$env:FETCHR_DEV = "1"
python gui/app.py
```

Set `FETCHR_DEV=1` so PyWebview loads from the Vite dev server instead of the built files.

## Build Installer

### Step 1 — Build React Frontend

```powershell
cd gui/frontend_react
npm run build
# Output: gui/frontend/
```

### Step 2 — Build Python Executable

```powershell
# From repo root, with venv active
python gui/build_gui.py
# Output: dist/yt-dlp/
```

### Step 3 — Create Windows Installer

Requires [Inno Setup 6](https://jrsoftware.org/isinfo.php).

```powershell
& 'C:\Program Files (x86)\Inno Setup 6\ISCC.exe' gui\installer.iss
# Output: dist/Fetchr-setup.exe
```

Or open `gui/installer.iss` in Inno Setup Compiler and press **Ctrl+F9**.

> **Note:** The browser extension folder (`extension/`) must exist at the repo root before building the installer. It is not tracked in git.

## Project Structure

```
fetchr/
├── gui/
│   ├── app.py                <- PyWebview entry point, starts HTTP bridge
│   ├── api.py                <- Python API callable from JavaScript
│   ├── downloader.py         <- yt-dlp wrapper (download, pause, resume, notifications)
│   ├── extension_bridge.py   <- HTTP bridge server (port 9099) for browser extension
│   ├── utils.py              <- Helpers: paths, app data, FFmpeg detection
│   ├── build_gui.py          <- PyInstaller build script
│   ├── installer.iss         <- Inno Setup installer script
│   ├── bin/                  <- ffmpeg, ffprobe (not in git — auto-downloaded on first run)
│   └── frontend_react/       <- React 19 + TypeScript source
│       └── src/
│           ├── App.tsx
│           ├── hooks/
│           │   └── usePyApi.ts       <- Python <-> JS bridge types + AppSettings
│           └── components/
│               ├── ActiveDownloads.tsx
│               ├── FFmpegSetupModal.tsx
│               ├── HistoryTable.tsx
│               ├── PlaylistModal.tsx
│               ├── QueueSection.tsx
│               ├── SettingsPage.tsx
│               ├── Sidebar.tsx
│               ├── VideoInfoCard.tsx
│               └── DeleteModal.tsx
├── extension/                <- Browser extension (not in git)
│   ├── manifest.json         <- Chrome / Edge / Brave
│   ├── manifest.firefox.json <- Firefox
│   ├── background.js
│   ├── content.js
│   ├── popup/
│   └── icons/
├── docs-local/               <- Private notes, credentials (not in git)
├── fetchr.ico
└── requirements.txt
```

## Architecture Overview

```
Browser Extension
      |  POST /send-url (Bearer token, port 9099)
      v
extension_bridge.py  -->  api._on_bridge_url()
                                  |
                     evaluate_js("window.onReceiveUrl(...)")
                                  |
                         React Frontend (App.tsx)
                                  |
                     window.pywebview.api.*()
                                  |
                     api.py  -->  downloader.py  -->  yt-dlp
                                       |
                             plyer notification (on done/error)
```

**Python <-> JavaScript bridge rules:**
- JS -> Python: `window.pywebview.api.method_name(args)`
- Python -> JS: `window.evaluate_js(f"if(window.fn){{window.fn({json.dumps(data)});}}")`
- All data through `evaluate_js()` **must** use `json.dumps()` to prevent XSS injection.

**Browser extension token:**
- 32-char hex token generated at Fetchr startup
- Stored at `%APPDATA%\Fetchr\bridge_token.txt`
- Shown in **Settings -> Browser Extension**; paste into the extension popup once

**AppData layout:**
```
%APPDATA%\Fetchr\
├── settings.json       <- user preferences
├── history.json        <- download history
├── bridge_token.txt    <- extension auth token
├── bin\                <- ffmpeg.exe, ffprobe.exe (auto-downloaded)
└── extension\          <- browser extension files (copied by installer)
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## License

MIT License — see [LICENSE](LICENSE).

yt-dlp (the underlying engine) is licensed under [The Unlicense](https://unlicense.org/).
