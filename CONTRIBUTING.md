# Contributing to Fetchr

Thank you for your interest in contributing!

## Development Setup

```bash
git clone https://github.com/muhafif24/Fetchr.git
cd Fetchr

python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt

cd gui/frontend_react
npm install
```

## Running in Dev Mode

```bash
# Terminal 1 — frontend hot reload
cd gui/frontend_react
npm run dev

# Terminal 2 — Python backend
$env:FETCHR_DEV="1"
python gui/app.py
```

App will open at `http://localhost:5175`.

## Project Structure

```
gui/
├── app.py          ← PyWebview window entry point
├── api.py          ← All Python functions callable from JS
├── downloader.py   ← yt-dlp wrapper (download, progress hooks)
├── utils.py        ← Helper functions
└── frontend_react/ ← React 19 + TypeScript frontend
    └── src/
        ├── App.tsx             ← Root component
        ├── hooks/usePyApi.ts   ← Python ↔ JS bridge
        └── components/         ← UI components
```

## How Python ↔ JS Communication Works

```
JS → Python:   window.pywebview.api.function_name(args)
Python → JS:   window.evaluate_js("window.onEvent && window.onEvent(data)")
```

All data passed through `evaluate_js()` MUST use `json.dumps()` to prevent XSS.

## Pull Request Guidelines

1. Fork the repo and create a branch: `git checkout -b feat/your-feature`
2. Make your changes
3. Test manually in dev mode
4. Run TypeScript check: `cd gui/frontend_react && npx tsc --noEmit`
5. Submit a pull request with a clear description

## Reporting Bugs

Open an issue with:
- Windows version
- Steps to reproduce
- Expected vs actual behavior
- URL that caused the issue (if applicable)
