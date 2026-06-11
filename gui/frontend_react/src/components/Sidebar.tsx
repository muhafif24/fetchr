import { Download, ListVideo, Clock, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { QueueItem } from './QueueSection';

export type Tab = 'download' | 'queue' | 'history' | 'settings';

const NAV: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'download', label: 'Download', icon: Download },
  { id: 'queue',    label: 'Queue',    icon: ListVideo },
  { id: 'history',  label: 'History',  icon: Clock },
  { id: 'settings', label: 'Settings', icon: Settings },
];

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
}

export function Sidebar({
  activeTab,
  onTabChange,
  queueItems,
  activeDownloadCount,
  ffmpegReady,
  ffmpegSource,
  jsReady,
  jsName,
  appVersion,
}: Props) {
  const pendingOrActive = queueItems.filter(
    (i) => i.status === 'pending' || i.status === 'downloading'
  ).length + activeDownloadCount;

  return (
    <aside className="w-48 shrink-0 flex flex-col h-screen bg-[#0f0f0f] border-r border-[#242424]">

      {/* Brand */}
      <div className="h-14 flex items-center gap-3 px-4 border-b border-[#242424]">
        <img src="/favicon.png" alt="Fetchr" className="w-7 h-7 shrink-0 rounded-lg" />
        <p className="text-sm font-semibold text-neutral-100 tracking-tight">Fetchr</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors text-left relative',
              activeTab === id
                ? 'text-neutral-100 font-medium bg-neutral-900 before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-0.5 before:rounded-full before:bg-rose-500'
                : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900/50'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{label}</span>
            {id === 'queue' && pendingOrActive > 0 && (
              <span className="ml-auto text-[10px] font-bold bg-rose-500/10 text-rose-400 px-1.5 py-px rounded-full tabular-nums border border-rose-500/20">
                {pendingOrActive}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* System Status */}
      <div className="p-3 border-t border-[#242424] space-y-1.5">
        <p className="text-[10px] font-medium text-neutral-600 uppercase tracking-wider px-1 pb-0.5">
          System
        </p>
        <StatusRow ok={ffmpegReady} label={ffmpegReady
          ? `FFmpeg · ${ffmpegSource === 'appdata' ? 'AppData' : ffmpegSource === 'bundled' ? 'Bundled' : 'System'}`
          : 'FFmpeg not found'} />
        <StatusRow ok={jsReady} label={jsReady ? (jsName ?? 'JS engine') : 'JS engine missing'} />
        {appVersion && (
          <p className="text-[10px] text-neutral-700 px-1 pt-0.5 select-none">v{appVersion}</p>
        )}
      </div>
    </aside>
  );
}

function StatusRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 px-1">
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', ok ? 'bg-emerald-500' : 'bg-neutral-700')} />
      <span className="text-xs text-neutral-500 truncate">{label}</span>
    </div>
  );
}
