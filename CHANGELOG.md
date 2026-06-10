# Changelog

All notable changes to Fetchr will be documented here.

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
