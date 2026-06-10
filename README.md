# Fetchr

Modern desktop GUI for yt-dlp — download videos from 1000+ sites with a clean, minimal interface.

![Fetchr Screenshot](docs/screenshot-download.png)

## Features

- Download videos from **YouTube, TikTok, Instagram, Twitter, Twitch**, and 1000+ other sites
- Choose format: Best Quality, Audio Only (MP3), 1080p, 720p, 480p, 360p
- Download subtitles (embedded or separate .srt file)
- Playlist support — pick specific videos from a playlist
- Batch queue — paste multiple URLs, download all at once
- Real-time download progress
- Download history with quick access (play, open folder)
- System tray — minimize to tray, runs in background
- Auto-update notifications
- Dark elegant UI

## Download

Go to [Releases](../../releases) and download the latest `Fetchr-setup.exe`.

> **Requirements:** Windows 10/11 with Microsoft Edge (WebView2) installed.
> WebView2 is included in the installer — no separate download needed.

## Legal Disclaimer

Fetchr is a tool for downloading media. Please use it only for:
- Content you own the rights to
- Content under Creative Commons or open licenses
- Content that explicitly permits downloading

Users are solely responsible for compliance with the Terms of Service of each platform (YouTube, etc.) and applicable copyright law. The developer is not responsible for misuse of this tool.

## Tech Stack

- **Backend:** Python + [yt-dlp](https://github.com/yt-dlp/yt-dlp) + PyWebview
- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS v4 + Shadcn/ui
- **Build:** PyInstaller + Inno Setup

## Development Setup

```bash
# Clone repo
git clone https://github.com/muhafif24/Fetchr.git
cd Fetchr

# Create virtual environment
python -m venv .venv
.venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Install frontend dependencies
cd gui/frontend_react
npm install

# Run in dev mode (hot reload)
cd ../..
$env:FETCHR_DEV="1"
npm run dev --prefix gui/frontend_react
# In another terminal:
python gui/app.py
```

## Build Installer

```bash
# 1. Build React frontend
cd gui/frontend_react
npm run build

# 2. Build Python executable
cd ../..
python gui/build_gui.py

# 3. Create installer (requires Inno Setup)
# Open gui/installer.iss in Inno Setup Compiler → Build
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## License

MIT License — see [LICENSE](LICENSE).

yt-dlp (the underlying engine) is licensed under [The Unlicense](https://unlicense.org/).
