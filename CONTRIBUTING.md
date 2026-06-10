# Contributing to Fetchr

Thank you for your interest in contributing!

## Development Setup

```powershell
git clone https://github.com/muhafif24/Fetchr.git
cd Fetchr

python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt

cd gui/frontend_react
npm install
cd ../..
```

## Running in Dev Mode

```powershell
# Terminal 1 — frontend hot reload (http://localhost:5175)
cd gui/frontend_react
npm run dev

# Terminal 2 — Python backend
$env:FETCHR_DEV = "1"
python gui/app.py
```

## Project Structure

```
gui/
├── app.py               <- PyWebview entry point, starts HTTP bridge
├── api.py               <- All Python functions callable from JS
├── downloader.py        <- yt-dlp wrapper (download, pause, resume, notifications)
├── extension_bridge.py  <- HTTP bridge for browser extension (port 9099)
├── utils.py             <- Helper functions (paths, FFmpeg detection, AppData)
└── frontend_react/      <- React 19 + TypeScript frontend
    └── src/
        ├── App.tsx              <- Root component, bridge/window callbacks
        ├── hooks/
        │   └── usePyApi.ts      <- Python <-> JS type-safe bridge + AppSettings type
        └── components/
            ├── ActiveDownloads.tsx    <- pause/resume UI
            ├── FFmpegSetupModal.tsx   <- on-demand FFmpeg download modal
            ├── HistoryTable.tsx
            ├── PlaylistModal.tsx
            ├── QueueSection.tsx
            ├── SettingsPage.tsx       <- preferences + browser extension section
            ├── Sidebar.tsx
            ├── VideoInfoCard.tsx
            └── DeleteModal.tsx
```

## Python <-> JS Communication

```
JS -> Python:   window.pywebview.api.function_name(args)
Python -> JS:   window.evaluate_js("if(window.fn){window.fn(data);}")
```

All data passed through `evaluate_js()` **must** use `json.dumps()` to prevent XSS injection.

## Adding a New Python API Method

1. Add the method to `api.py` on the `Api` class
2. Add its TypeScript type signature to `hooks/usePyApi.ts` in `PyApiInterface`
3. Call it from React via `window.pywebview.api.your_method()`

## AppSettings

User preferences are defined in `hooks/usePyApi.ts` as `AppSettings` interface and `DEFAULT_SETTINGS`.  
On the Python side, `api.py` reads/writes `%APPDATA%\Fetchr\settings.json` via `get_settings()` and `save_settings()`.

## TypeScript Check

Before submitting a PR, make sure there are no TypeScript errors:

```powershell
cd gui/frontend_react
npx tsc --noEmit
```

## Pull Request Guidelines

1. Fork the repo and create a branch: `git checkout -b feat/your-feature`
2. Make your changes
3. Test manually in dev mode
4. Run TypeScript check (see above)
5. Submit a pull request with a clear description of what and why

## Reporting Bugs

Open an issue with:
- Windows version
- Fetchr version (shown in Settings or title bar)
- Steps to reproduce
- Expected vs actual behavior
- URL that caused the issue (if applicable)
