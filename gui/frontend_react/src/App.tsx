import { useState, useEffect, useRef } from 'react';
import { usePyApi } from './hooks/usePyApi';
import { Input } from './components/ui/input';
import { Button } from './components/ui/button';
import { Alert, AlertDescription } from './components/ui/alert';
import { RefreshCw, AlertCircle, Link, ListVideo, Download } from 'lucide-react';
import { cn } from './lib/utils';

import { TopBar, type Tab } from './components/TopBar';
import { VideoInfoCard, type VideoInfo } from './components/VideoInfoCard';
import { ActiveDownloads, type ActiveDownload } from './components/ActiveDownloads';
import { QueueSection, type QueueItem } from './components/QueueSection';
import { HistoryTable, type HistoryItem } from './components/HistoryTable';
import { PlaylistModal, type PlaylistInfo } from './components/PlaylistModal';
import { DeleteModal } from './components/DeleteModal';
import { ClearHistoryModal } from './components/ClearHistoryModal';
import { ToastContainer, type ToastItem, type ToastType } from './components/Toast';
import { SettingsPage } from './components/SettingsPage';
import { FFmpegSetupModal } from './components/FFmpegSetupModal';
import { DEFAULT_SETTINGS, type AppSettings } from './hooks/usePyApi';

export default function App() {
  const { api, isReady } = usePyApi();

  // Navigation
  const [activeTab, setActiveTab] = useState<Tab>('download');

  // URL input & analysis
  const [url, setUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Video info form
  const [currentVideo, setCurrentVideo] = useState<VideoInfo | null>(null);
  const [selectedFormat, setSelectedFormat] = useState('best');
  const [outputDir, setOutputDir] = useState('');
  const outputDirRef = useRef(outputDir);
  useEffect(() => { outputDirRef.current = outputDir; }, [outputDir]);
  const [subtitleEnabled, setSubtitleEnabled] = useState(false);
  const [subtitleLang, setSubtitleLang] = useState('en');
  const [embedSubs, setEmbedSubs] = useState(true);

  // Downloads
  const [activeDownloads, setActiveDownloads] = useState<{ [id: string]: ActiveDownload }>({});
  const activeDownloadsRef = useRef(activeDownloads);
  useEffect(() => { activeDownloadsRef.current = activeDownloads; }, [activeDownloads]);

  // History
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Queue
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const queueItemsRef = useRef(queueItems);
  useEffect(() => { queueItemsRef.current = queueItems; }, [queueItems]);
  const [batchInput, setBatchInput] = useState('');
  const [queueFormat, setQueueFormat] = useState('best');

  // Playlist
  const [playlistInfo, setPlaylistInfo] = useState<PlaylistInfo | null>(null);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [isLoadingPlaylist, setIsLoadingPlaylist] = useState(false);
  const [playlistError, setPlaylistError] = useState<string | null>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ index: number; title: string } | null>(null);
  const [deleteFileAlso, setDeleteFileAlso] = useState(false);

  // Clear-all confirmation
  const [clearAllOpen, setClearAllOpen] = useState(false);
  const [clearAllDeleteFiles, setClearAllDeleteFiles] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Settings
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const appSettingsRef = useRef(appSettings);
  useEffect(() => { appSettingsRef.current = appSettings; }, [appSettings]);

  // App version (fetched from Python, fallback for dev mode)
  const [appVersion, setAppVersion] = useState<string>('1.5.0');

  // Bridge / extension
  const [bridgeToken, setBridgeToken]       = useState<string | null>(null);
  const [bridgePort, setBridgePort]         = useState<number>(9099);
  const [extensionDir, setExtensionDir]     = useState<string>('');

  // System status
  const [ffmpegStatus, setFfmpegStatus] = useState<{ available: boolean; source: string | null }>({
    available: false, source: null,
  });
  const [jsStatus, setJsStatus] = useState<{ available: boolean; name: string | null }>({
    available: false, name: null,
  });

  // FFmpeg on-demand setup
  type FfmpegPhase = 'idle' | 'downloading' | 'extracting' | 'done' | 'error';
  const [ffmpegSetupDismissed, setFfmpegSetupDismissed] = useState(false);
  const [ffmpegPhase, setFfmpegPhase] = useState<FfmpegPhase>('idle');
  const [ffmpegProgress, setFfmpegProgress] = useState(0);
  const [ffmpegSetupError, setFfmpegSetupError] = useState<string | null>(null);

  // Update banner
  const [updateInfo, setUpdateInfo] = useState<{ version: string; name: string; url: string } | null>(null);
  const [updateDismissed, setUpdateDismissed] = useState(false);

  // Toasts (pengganti alert() native)
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const showToast = (type: ToastType, message: string) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };
  const dismissToast = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  // ─── Init ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isReady || !api) return;
    loadSettings();
    checkSystemDependencies();
    loadHistory();
    checkForUpdate();
    api.get_app_version().then(setAppVersion).catch(() => {});

    (window as any).onFfmpegProgress = (percent: number, status: string) => {
      setFfmpegProgress(percent);
      setFfmpegPhase(status === 'extracting' ? 'extracting' : status === 'done' ? 'done' : 'downloading');
    };
    (window as any).onFfmpegComplete = (success: boolean, error: string | null) => {
      if (success) {
        setFfmpegPhase('done');
        setFfmpegProgress(100);
        checkSystemDependencies();
      } else {
        setFfmpegPhase('error');
        setFfmpegSetupError(error ?? 'Unknown error');
      }
    };

    (window as any).updateDownloadProgress = (payload: any) => handleProgressUpdate(payload);
    (window as any).onReceiveUrl = (receivedUrl: string) => {
      setUrl(receivedUrl);
      setActiveTab('download');
      setCurrentVideo(null);
      setAnalysisError(null);
      // Short delay so state flushes before analyze kicks off
      setTimeout(() => analyzeUrl(receivedUrl), 100);
    };
    // Extension B-lite: download langsung dgn format preset, tampil di UI Queue
    (window as any).onReceiveDownload = (dlUrl: string, format: string) =>
      handleExternalDownload(dlUrl, format);
    (window as any).onDownloadStarted = (downloadId: string, title: string) => {
      setActiveDownloads((prev) => {
        const item = prev[downloadId];
        if (!item) return prev;
        return { ...prev, [downloadId]: { ...item, title } };
      });
      setQueueItems((prev) => prev.map((q) => (q.downloadId === downloadId ? { ...q, title } : q)));
    };
    (window as any).onDownloadComplete = (downloadId: string, filename: string) =>
      handleDownloadComplete(downloadId, filename);
    (window as any).onDownloadError = (downloadId: string, errorMsg: string) =>
      handleDownloadError(downloadId, errorMsg);
  }, [isReady, api]);

  // Load bridge info lazily when Settings tab opens
  useEffect(() => {
    if (activeTab === 'settings' && api && bridgeToken === null) {
      loadBridgeInfo();
    }
  }, [activeTab, api]);

  // ─── Settings ─────────────────────────────────────────────────────────────

  const loadSettings = async () => {
    if (!api) return;
    try {
      const s = await api.get_settings();
      setAppSettings(s);
      if (s.outputDir) setOutputDir(s.outputDir);
      if (s.defaultFormat) setSelectedFormat(s.defaultFormat);
      if (s.subtitleLang) setSubtitleLang(s.subtitleLang);
      setEmbedSubs(s.embedSubs ?? true);
    } catch (err) { console.error(err); }
  };

  const loadBridgeInfo = async () => {
    if (!api) return;
    const [tok, port, dir] = await Promise.all([
      api.get_bridge_token(),
      api.get_bridge_port(),
      api.get_extension_dir(),
    ]);
    setBridgeToken(tok);
    setBridgePort(port);
    setExtensionDir(dir);
  };

  const handleRegenerateToken = async () => {
    if (!api) return;
    const res = await api.regenerate_bridge_token();
    if (res.success) setBridgeToken(res.token);
  };

  const handleSaveSettings = async (settings: AppSettings) => {
    if (!api) return;
    await api.save_settings(settings);
    setAppSettings(settings);
    setOutputDir(settings.outputDir);
  };

  // ─── System ──────────────────────────────────────────────────────────────

  const checkSystemDependencies = async () => {
    if (!api) return;
    try {
      const status = await api.check_system_status();
      setFfmpegStatus({ available: status.ffmpeg.available, source: status.ffmpeg.source });
      setJsStatus({ available: status.js_runtime.available, name: status.js_runtime.name });
      // Hanya pakai default_dir jika settings belum load outputDir
      if (!appSettings.outputDir) setOutputDir(status.default_dir);
    } catch (err) { console.error(err); }
  };

  const handleDownloadFfmpeg = async () => {
    if (!api) return;
    setFfmpegPhase('downloading');
    setFfmpegProgress(0);
    setFfmpegSetupError(null);
    await api.download_ffmpeg();
  };

  const handleOpenFfmpegSetup = () => {
    setFfmpegPhase('idle');
    setFfmpegProgress(0);
    setFfmpegSetupError(null);
    setFfmpegSetupDismissed(false);
  };

  const checkForUpdate = async () => {
    if (!api) return;
    try {
      const result = await api.check_for_update();
      if (result.success && result.has_update && result.latest_version && result.release_url) {
        setUpdateInfo({ version: result.latest_version, name: result.release_name || `v${result.latest_version}`, url: result.release_url });
      }
    } catch { /* silent */ }
  };

  // ─── History ─────────────────────────────────────────────────────────────

  const loadHistory = async () => {
    if (!api) return;
    try { setHistory(await api.get_download_history()); }
    catch (err) { console.error(err); }
  };

  const handleDeleteItem = async () => {
    if (deleteTarget === null || !api) return;
    try {
      const res = await api.delete_history_item(deleteTarget.index, deleteFileAlso);
      if (res.success) { loadHistory(); setDeleteTarget(null); setDeleteFileAlso(false); }
      else showToast('error', `Failed to delete: ${res.error}`);
    } catch (err: any) { showToast('error', err.message); }
  };

  const handleClearAllHistory = () => {
    if (history.length === 0) return;
    setClearAllDeleteFiles(false);
    setClearAllOpen(true);
  };

  const confirmClearAll = async () => {
    if (!api) return;
    setIsClearing(true);
    try {
      // Hapus dari index terakhir agar index tetap valid selama loop
      for (let i = history.length - 1; i >= 0; i--) {
        await api.delete_history_item(i, clearAllDeleteFiles);
      }
      await loadHistory();
      showToast('success', clearAllDeleteFiles ? 'History cleared and files deleted.' : 'History cleared.');
    } catch (err: any) {
      showToast('error', `Failed to clear history: ${err.message}`);
    } finally {
      setIsClearing(false);
      setClearAllOpen(false);
      setClearAllDeleteFiles(false);
    }
  };

  const handlePlayVideo  = async (folder: string, filename: string) => {
    if (!api) return;
    const res = await api.play_video(folder, filename);
    if (!res.success) showToast('error', `Failed to play: ${res.error}`);
  };

  const handleOpenFolder = async (folder: string) => {
    if (!folder) { showToast('error', 'Folder path is empty.'); return; }
    if (!api) return;
    await api.open_folder(folder);
  };

  // ─── Download callbacks ───────────────────────────────────────────────────

  const handleProgressUpdate = (payload: any) => {
    setActiveDownloads((prev) => {
      const item = prev[payload.id];
      if (!item) return prev;
      return { ...prev, [payload.id]: { ...item, status: payload.status, phase: payload.phase ?? item.phase, progress: payload.progress, speed: payload.speed, downloaded: payload.downloaded, total: payload.total, eta: payload.eta, isResuming: payload.isResuming ?? false } };
    });
  };

  const handleDownloadComplete = async (downloadId: string, filename: string) => {
    const activeItem = activeDownloadsRef.current[downloadId];
    if (activeItem && api) {
      try {
        await api.add_to_history(activeItem.title, activeItem.url, activeItem.formatLabel, activeItem.folder, filename);
        loadHistory();
      } catch (err) { console.error(err); }
    }
    setActiveDownloads((prev) => {
      const item = prev[downloadId];
      if (!item) return prev;
      return { ...prev, [downloadId]: { ...item, status: 'finished', progress: 100, speed: 'Finished' } };
    });
    setQueueItems((prev) => prev.map((q) => (q.downloadId === downloadId ? { ...q, status: 'done' } : q)));
    setTimeout(() => {
      setActiveDownloads((prev) => { const copy = { ...prev }; delete copy[downloadId]; return copy; });
    }, 4000);

    // Auto-advance queue: start next pending item if slot is available
    const limit = appSettingsRef.current.concurrentDownloads;
    // -1 because the finished download is still counted in activeDownloadsRef at this point
    const active = Math.max(0, getActiveDownloadCount() - 1);
    if (active < limit) {
      const nextItem = queueItemsRef.current.find((i) => i.status === 'pending');
      if (nextItem) {
        const completedItem = activeDownloadsRef.current[downloadId];
        const dir = completedItem?.folder || outputDir;
        await startOneQueueItem(nextItem, queueFormat, dir);
      }
    }
  };

  const handleDownloadError = (downloadId: string, errorMsg: string) => {
    const msg = errorMsg.includes('cancelled') ? 'Download canceled by user.' : errorMsg;
    setActiveDownloads((prev) => {
      const item = prev[downloadId];
      if (!item) return prev;
      return { ...prev, [downloadId]: { ...item, status: 'error', speed: 'Failed', error: msg } };
    });
    setQueueItems((prev) => prev.map((q) => (q.downloadId === downloadId ? { ...q, status: 'error', error: msg } : q)));
  };

  // ─── Single video ─────────────────────────────────────────────────────────

  const isPlaylistUrl = (u: string) => {
    try {
      const p = new URL(u);
      const list = p.searchParams.get('list');
      if (list && !list.startsWith('RD') && !list.startsWith('FL')) return true;
      if (p.pathname === '/playlist') return true;
    } catch { /**/ }
    return false;
  };

  const analyzeUrl = async (targetUrl: string) => {
    if (!targetUrl.trim() || !api) return;
    setIsAnalyzing(true); setAnalysisError(null); setCurrentVideo(null);
    try {
      const result = await api.get_video_info(targetUrl.trim());
      if (result.success) {
        setCurrentVideo(result as VideoInfo);
        setSelectedFormat('best'); setSubtitleEnabled(false);
        const subs = result.subtitles || [];
        setSubtitleLang(subs.find((s: any) => !s.auto)?.code || subs[0]?.code || 'en');
      } else { setAnalysisError(result.error || 'Analysis failed.'); }
    } catch (err: any) { setAnalysisError(err.message || 'An error occurred.'); }
    finally { setIsAnalyzing(false); }
  };

  const handleAnalyze = () => analyzeUrl(url);

  const handleBrowseFolder = async () => {
    if (!api) return;
    const selected = await api.select_folder();
    if (selected) setOutputDir(selected);
  };

  const handleStartDownload = async () => {
    if (!currentVideo || !api) return;
    const formatObj = currentVideo.formats.find((f) => f.id === selectedFormat);
    const formatLabel = formatObj
      ? (formatObj.id === 'best' ? 'Best Quality (Auto)' : formatObj.id === 'bestaudio' ? 'Audio Only (MP3)' : formatObj.label)
      : selectedFormat;

    const currentUrl = url.trim();
    const res = await api.start_download(currentUrl, selectedFormat, outputDir, subtitleEnabled ? subtitleLang : null, embedSubs);
    if (res.success && res.download_id) {
      const dId = res.download_id;
      setActiveDownloads((prev) => ({ ...prev, [dId]: { id: dId, title: currentVideo.title, progress: 0, speed: '—', downloaded: '0 B', total: '—', eta: '—', status: 'starting', phase: 1, formatLabel, formatId: selectedFormat, url: currentUrl, folder: outputDir, isResuming: false } }));
      setCurrentVideo(null); setUrl(''); setSubtitleEnabled(false);
    } else { showToast('error', `Failed to start download: ${res.error}`); }
  };

  // Download langsung dari browser extension (B-lite) — format preset, tanpa analisa
  const handleExternalDownload = async (extUrl: string, format: string) => {
    if (!api) return;
    const FORMAT_LABELS: Record<string, string> = {
      best: 'Best Quality (Auto)', bestaudio: 'Audio Only (MP3)',
      '1080': '1080p Full HD', '720': '720p HD', '480': '480p', '360': '360p',
    };
    const dir = outputDirRef.current;
    const res = await api.start_download(extUrl, format, dir);
    if (res.success && res.download_id) {
      const dId = res.download_id;
      setActiveDownloads((prev) => ({ ...prev, [dId]: { id: dId, title: extUrl, progress: 0, speed: '—', downloaded: '0 B', total: '—', eta: '—', status: 'starting', phase: 1, formatLabel: FORMAT_LABELS[format] || format, formatId: format, url: extUrl, folder: dir, isResuming: false } }));
      setActiveTab('queue');
      showToast('success', 'Download dimulai dari browser extension.');
    } else {
      showToast('error', `Extension download gagal: ${res.error}`);
    }
  };

  // ─── Playlist ─────────────────────────────────────────────────────────────

  const handleLoadPlaylist = async () => {
    if (!url.trim() || !api) return;
    setIsLoadingPlaylist(true); setPlaylistError(null); setPlaylistInfo(null);
    try {
      const result = await api.get_playlist_info(url.trim());
      if (result.success && result.entries) {
        setPlaylistInfo({ title: result.title || 'Playlist', uploader: result.uploader || '', count: result.count || result.entries.length, entries: result.entries });
        setSelectedEntries(new Set(result.entries.map((e: any) => e.id)));
      } else { setPlaylistError(result.error || 'Failed to load playlist.'); }
    } catch (err: any) { setPlaylistError(err.message || 'An error occurred.'); }
    finally { setIsLoadingPlaylist(false); }
  };

  const handleAddPlaylistToQueue = () => {
    if (!playlistInfo) return;
    const selected = playlistInfo.entries.filter((e) => selectedEntries.has(e.id));
    setQueueItems((prev) => [...prev, ...selected.map((e) => ({ id: crypto.randomUUID(), url: e.url, status: 'pending' as const, title: e.title }))]);
    setPlaylistInfo(null); setUrl('');
    setActiveTab('queue');
  };

  // ─── Queue ────────────────────────────────────────────────────────────────

  const handleAddToQueue = () => {
    const urls = batchInput.split('\n').map((u) => u.trim()).filter(Boolean);
    if (!urls.length) return;
    setQueueItems((prev) => [...prev, ...urls.map((u) => ({ id: crypto.randomUUID(), url: u, status: 'pending' as const }))]);
    setBatchInput('');
  };

  // Hitung berapa download yang sedang aktif (dari queue maupun standalone)
  const getActiveDownloadCount = () =>
    Object.values(activeDownloadsRef.current).filter(
      (d) => d.status === 'downloading' || d.status === 'starting'
    ).length;

  // Mulai satu queue item — dipakai oleh handleDownloadQueue dan auto-advance
  const startOneQueueItem = async (item: QueueItem, format: string, dir: string) => {
    if (!api) return;
    const res = await api.start_download(item.url, format, dir);
    if (res.success && res.download_id) {
      const dId = res.download_id;
      setQueueItems((prev) => prev.map((q) => q.id === item.id ? { ...q, status: 'downloading', downloadId: dId } : q));
      setActiveDownloads((prev) => ({ ...prev, [dId]: { id: dId, title: item.url, progress: 0, speed: '—', downloaded: '0 B', total: '—', eta: '—', status: 'starting', phase: 1, formatLabel: format, formatId: format, url: item.url, folder: dir, isResuming: false } }));
    } else {
      setQueueItems((prev) => prev.map((q) => q.id === item.id ? { ...q, status: 'error', error: res.error || 'Failed.' } : q));
    }
  };

  const handleDownloadQueue = async () => {
    if (!api) return;
    const limit = appSettingsRef.current.concurrentDownloads;
    const active = getActiveDownloadCount();
    const slots = Math.max(0, limit - active);
    const toStart = queueItems.filter((i) => i.status === 'pending').slice(0, slots);
    for (const item of toStart) {
      await startOneQueueItem(item, queueFormat, outputDir);
    }
  };

  const handlePauseDownload = async (id: string) => {
    if (!api) return;
    await api.pause_download(id);
    setActiveDownloads((prev) => {
      const item = prev[id];
      if (!item) return prev;
      return { ...prev, [id]: { ...item, status: 'pausing' } };
    });
  };

  const handleResumeDownload = async (id: string) => {
    if (!api) return;
    const item = activeDownloadsRef.current[id];
    if (!item) return;
    const res = await api.start_download(item.url, item.formatId, item.folder);
    if (res.success && res.download_id) {
      const newId = res.download_id;
      setActiveDownloads((prev) => {
        const copy = { ...prev };
        delete copy[id];
        copy[newId] = { ...item, id: newId, status: 'starting', progress: 0, speed: '—', downloaded: '0 B', total: '—', eta: '—', isResuming: false };
        return copy;
      });
    }
  };

  const handleCancelQueueItem  = async (downloadId: string) => { if (api) await api.cancel_download(downloadId); };
  const handleCancelAllQueue   = async () => { if (!api) return; for (const q of queueItems.filter((i) => i.status === 'downloading' && i.downloadId)) await api.cancel_download(q.downloadId!); };
  const handleClearDoneQueue   = () => setQueueItems((prev) => prev.filter((i) => i.status === 'pending' || i.status === 'downloading'));
  const handleClearAllQueue    = async () => { await handleCancelAllQueue(); setQueueItems([]); };

  // ─── Derived ──────────────────────────────────────────────────────────────

  const queueDownloadIds    = new Set(queueItems.map((q) => q.downloadId).filter(Boolean) as string[]);
  const standaloneDownloads = Object.values(activeDownloads).filter((d) => !queueDownloadIds.has(d.id));

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a] text-neutral-100">

      {/* Top navigation bar */}
      <TopBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        queueItems={queueItems}
        activeDownloadCount={standaloneDownloads.length}
        ffmpegReady={ffmpegStatus.available}
        ffmpegSource={ffmpegStatus.source}
        jsReady={jsStatus.available}
        jsName={jsStatus.name}
        appVersion={appVersion}
        updateInfo={updateInfo && !updateDismissed ? updateInfo : null}
        onDismissUpdate={() => setUpdateDismissed(true)}
        onOpenUpdateUrl={(url) => api?.open_url(url)}
      />

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 pt-8 pb-10 space-y-5">

            {/* ── DOWNLOAD TAB ── */}
            {activeTab === 'download' && (
              <div className="space-y-6">

                {/* Hero URL input */}
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Link className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500 pointer-events-none" />
                      <Input
                        type="text"
                        placeholder="Paste a video or playlist URL..."
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (isPlaylistUrl(url) ? handleLoadPlaylist() : handleAnalyze())}
                        className={cn(
                          'pl-11 h-12 text-sm bg-[#141414] border-[#242424] text-neutral-100 placeholder:text-neutral-600',
                          'focus-visible:ring-1 focus-visible:ring-rose-500/40 focus-visible:border-rose-500/40'
                        )}
                        disabled={isAnalyzing || isLoadingPlaylist}
                      />
                    </div>

                    {isPlaylistUrl(url) ? (
                      <Button
                        onClick={handleLoadPlaylist}
                        disabled={isLoadingPlaylist || !url.trim()}
                        variant="outline"
                        className="h-12 px-5 bg-[#141414] hover:bg-[#1a1a1a] text-neutral-100 border-[#242424] text-sm font-medium shrink-0"
                      >
                        {isLoadingPlaylist
                          ? <><RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />Loading...</>
                          : <><ListVideo className="mr-2 h-3.5 w-3.5" />Load Playlist</>}
                      </Button>
                    ) : (
                      <Button
                        onClick={handleAnalyze}
                        disabled={isAnalyzing || !url.trim()}
                        className="h-12 px-6 bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium shrink-0"
                      >
                        {isAnalyzing
                          ? <><RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />Analyzing...</>
                          : 'Analyze'}
                      </Button>
                    )}
                  </div>

                  {isPlaylistUrl(url) && !playlistError && (
                    <div className="flex items-center gap-1.5 text-xs text-rose-400 pl-1">
                      <ListVideo className="h-3.5 w-3.5 shrink-0" />
                      <span>Playlist detected — click <strong>Load Playlist</strong> to pick videos</span>
                    </div>
                  )}

                  {(playlistError || analysisError) && (
                    <Alert variant="destructive" className="bg-red-950/20 border-red-900/30 text-red-400 py-2">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <AlertDescription className="text-xs ml-2">{playlistError || analysisError}</AlertDescription>
                    </Alert>
                  )}
                </div>

                {/* Video info card */}
                {currentVideo && (
                  <VideoInfoCard
                    video={currentVideo}
                    selectedFormat={selectedFormat}
                    outputDir={outputDir}
                    subtitleEnabled={subtitleEnabled}
                    subtitleLang={subtitleLang}
                    embedSubs={embedSubs}
                    onFormatChange={setSelectedFormat}
                    onBrowseFolder={handleBrowseFolder}
                    onSubtitleToggle={setSubtitleEnabled}
                    onSubtitleLangChange={setSubtitleLang}
                    onEmbedSubsChange={setEmbedSubs}
                    onStartDownload={handleStartDownload}
                  />
                )}

                {/* Empty state — kompak, tidak ada void hitam */}
                {!currentVideo && !isAnalyzing && (
                  <div className="rounded-xl border border-[#242424] bg-[#0d0d0d] px-6 py-10 flex flex-col items-center gap-4 select-none">
                    <div className="w-14 h-14 rounded-2xl bg-[#141414] border border-[#242424] flex items-center justify-center">
                      <Download className="h-6 w-6 text-neutral-600" />
                    </div>
                    <div className="text-center space-y-1.5">
                      <p className="text-sm font-medium text-neutral-400">Paste a URL above to get started</p>
                      <p className="text-xs text-neutral-600">YouTube · TikTok · Instagram · Twitter · 1000+ more</p>
                    </div>
                    <p className="text-[11px] text-neutral-700 border border-[#242424] rounded-md px-3 py-1.5 bg-[#141414] select-none">
                      Tip: press <kbd className="font-mono text-neutral-500">Enter</kbd> after pasting to analyze instantly
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── QUEUE TAB ── */}
            {activeTab === 'queue' && (
              <div className="space-y-5">

                <QueueSection
                  queueItems={queueItems}
                  batchInput={batchInput}
                  activeDownloads={activeDownloads}
                  queueFormat={queueFormat}
                  onBatchInputChange={setBatchInput}
                  onAddToQueue={handleAddToQueue}
                  onDownloadQueue={handleDownloadQueue}
                  onCancelQueueItem={handleCancelQueueItem}
                  onCancelAll={handleCancelAllQueue}
                  onClearDone={handleClearDoneQueue}
                  onClearAll={handleClearAllQueue}
                  onRemoveFromQueue={(id) => setQueueItems((prev) => prev.filter((i) => i.id !== id))}
                  onQueueFormatChange={setQueueFormat}
                />

                {/* Download tunggal */}
                {standaloneDownloads.length > 0 && (
                  <div className="flex items-center gap-3 pt-1">
                    <span className="text-xs font-medium text-neutral-600 uppercase tracking-wider shrink-0">Single Downloads</span>
                    <div className="flex-1 h-px bg-[#242424]" />
                  </div>
                )}
                <ActiveDownloads
                  downloads={standaloneDownloads}
                  onCancel={(id) => api?.cancel_download(id)}
                  onPause={handlePauseDownload}
                  onResume={handleResumeDownload}
                  onDismiss={(id) => setActiveDownloads((prev) => { const c = { ...prev }; delete c[id]; return c; })}
                />
              </div>
            )}

            {/* ── HISTORY TAB ── */}
            {activeTab === 'history' && (
              <HistoryTable
                history={history}
                onPlay={handlePlayVideo}
                onOpenFolder={handleOpenFolder}
                onDeleteClick={(index, title) => setDeleteTarget({ index, title })}
                onClearAll={handleClearAllHistory}
              />
            )}

            {/* ── SETTINGS TAB ── */}
            {activeTab === 'settings' && (
              <SettingsPage
                settings={appSettings}
                onSave={handleSaveSettings}
                onBrowseFolder={async () => api ? api.select_folder() : null}
                onBrowseCookieFile={async () => api ? api.select_file(['Text Files (*.txt)', 'All Files (*.*)']) : null}
                ffmpegAvailable={ffmpegStatus.available}
                ffmpegSource={ffmpegStatus.source}
                onSetupFfmpeg={handleOpenFfmpegSetup}
                bridgeToken={bridgeToken}
                bridgePort={bridgePort}
                extensionDir={extensionDir}
                onRegenerateToken={handleRegenerateToken}
                onOpenExtensionFolder={() => api?.open_folder(extensionDir)}
              />
            )}

          </div>
        </main>

      {/* Modals */}
      {playlistInfo && (
        <PlaylistModal
          playlistInfo={playlistInfo}
          selectedEntries={selectedEntries}
          onToggleEntry={(id) => setSelectedEntries((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; })}
          onSelectAll={(all) => setSelectedEntries(all ? new Set(playlistInfo.entries.map((e) => e.id)) : new Set())}
          onAddToQueue={handleAddPlaylistToQueue}
          onClose={() => setPlaylistInfo(null)}
        />
      )}

      {deleteTarget !== null && (
        <DeleteModal
          target={deleteTarget}
          deleteFileAlso={deleteFileAlso}
          onToggleDeleteFile={setDeleteFileAlso}
          onConfirm={handleDeleteItem}
          onCancel={() => { setDeleteTarget(null); setDeleteFileAlso(false); }}
        />
      )}

      {clearAllOpen && (
        <ClearHistoryModal
          count={history.length}
          deleteFilesAlso={clearAllDeleteFiles}
          busy={isClearing}
          onToggleDeleteFiles={setClearAllDeleteFiles}
          onConfirm={confirmClearAll}
          onCancel={() => { setClearAllOpen(false); setClearAllDeleteFiles(false); }}
        />
      )}

      {/* FFmpeg setup modal — shown when FFmpeg not found and not dismissed */}
      {!ffmpegStatus.available && !ffmpegSetupDismissed && isReady && (
        <FFmpegSetupModal
          phase={ffmpegPhase}
          progress={ffmpegProgress}
          error={ffmpegSetupError}
          onDownload={handleDownloadFfmpeg}
          onDismiss={() => {
            if (ffmpegPhase === 'done') checkSystemDependencies();
            setFfmpegSetupDismissed(true);
          }}
        />
      )}

      {/* Toasts — pengganti alert() native, non-blocking */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
