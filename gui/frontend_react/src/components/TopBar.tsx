import { Download, ListVideo, Clock, Settings } from 'lucide-react';
import { X, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { QueueItem } from './QueueSection';

export type Tab = 'download' | 'queue' | 'history' | 'settings';

interface UpdateInfo { name: string; url: string }

interface Props {
  activeTab: Tab;
  onTabChange: (t: Tab) => void;
  queueItems: QueueItem[];
  activeDownloadCount: number;
  ffmpegReady: boolean;
  ffmpegSource: string | null;
  jsReady: boolean;
  jsName: string | null;
  appVersion?: string;
  updateInfo?: UpdateInfo | null;
  onDismissUpdate?: () => void;
  onOpenUpdateUrl?: (url: string) => void;
}

const NAV: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'download', label: 'Download', icon: Download },
  { id: 'queue',    label: 'Queue',    icon: ListVideo },
  { id: 'history',  label: 'History',  icon: Clock },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function TopBar({
  activeTab, onTabChange, queueItems, activeDownloadCount,
  ffmpegReady, jsReady,
  appVersion, updateInfo, onDismissUpdate, onOpenUpdateUrl,
}: Props) {
  const pendingOrActive = queueItems.filter(
    (i) => i.status === 'pending' || i.status === 'downloading'
  ).length + activeDownloadCount;

  // Hanya tampilkan warning kalau ada masalah dependency
  const hasDepIssue = !ffmpegReady || !jsReady;

  return (
    <header className="h-11 shrink-0 flex items-stretch border-b border-[#242424] bg-[#0f0f0f]">

      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 border-r border-[#242424]">
        <img src="/favicon.png" alt="Fetchr" className="w-5 h-5 rounded-md shrink-0" />
        <span className="text-sm font-semibold text-neutral-100 tracking-tight">Fetchr</span>
      </div>

      {/* Primary nav — semua tab punya icon + label */}
      <nav className="flex items-stretch">
        {NAV.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={cn(
                'relative flex items-center gap-2 px-4 text-sm transition-colors',
                isActive
                  ? 'text-neutral-100 font-medium bg-neutral-800/40'
                  : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/30'
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span>{label}</span>

              {/* Queue badge */}
              {id === 'queue' && pendingOrActive > 0 && (
                <span className="text-[10px] font-bold bg-rose-500/10 text-rose-400 px-1.5 py-px rounded-full border border-rose-500/20 tabular-nums">
                  {pendingOrActive}
                </span>
              )}

              {/* Settings: dep warning badge */}
              {id === 'settings' && hasDepIssue && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              )}

              {/* Active underline */}
              {isActive && (
                <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-rose-500 rounded-t-full" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Dependency warning — hanya muncul kalau ada masalah */}
      {hasDepIssue && activeTab !== 'settings' && (
        <button
          onClick={() => onTabChange('settings')}
          className="flex items-center gap-1.5 px-3 border-l border-[#242424] text-xs text-amber-400 hover:text-amber-300 transition-colors"
          title={!ffmpegReady ? 'FFmpeg not found' : 'JS engine missing'}
        >
          <AlertTriangle className="h-3 w-3 shrink-0" />
          <span>{!ffmpegReady ? 'FFmpeg missing' : 'JS missing'}</span>
        </button>
      )}

      {/* Update banner */}
      {updateInfo && (
        <div className="flex items-center gap-2 px-3 border-l border-[#242424]">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
          <button
            onClick={() => onOpenUpdateUrl?.(updateInfo.url)}
            className="text-xs text-rose-400 hover:text-rose-300 transition-colors"
          >
            {updateInfo.name} available
          </button>
          <button
            onClick={onDismissUpdate}
            className="text-neutral-700 hover:text-neutral-400 transition-colors ml-1"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Version */}
      {appVersion && (
        <div className="flex items-center px-4 border-l border-[#242424]">
          <span className="text-[11px] text-neutral-700 select-none tabular-nums">v{appVersion}</span>
        </div>
      )}
    </header>
  );
}
