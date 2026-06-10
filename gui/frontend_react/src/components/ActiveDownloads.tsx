import { X, Pause, Play } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';

export interface ActiveDownload {
  id: string;
  title: string;
  progress: number;
  speed: string;
  downloaded: string;
  total: string;
  eta: string;
  status: string;
  phase: number;
  formatLabel: string;
  formatId: string;
  url: string;
  folder: string;
  isResuming?: boolean;
  error?: string;
}

interface Props {
  downloads: ActiveDownload[];
  onCancel: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onDismiss: (id: string) => void;
}

export function ActiveDownloads({ downloads, onCancel, onPause, onResume, onDismiss }: Props) {
  if (downloads.length === 0) return null;

  return (
    <Card className="bg-zinc-900/50 border-zinc-800/60 shadow-xl">
      <CardHeader className="py-4">
        <CardTitle className="text-sm font-semibold tracking-wider text-zinc-400 uppercase flex items-center gap-2">
          Active Downloads
          <span className="text-[10px] font-bold bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">
            {downloads.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {downloads.map((item) => {
          const isPaused = item.status === 'paused' || item.status === 'pausing';
          const isDone   = item.status === 'finished';
          const isError  = item.status === 'error';

          return (
            <div
              key={item.id}
              className={`border rounded-xl p-4 flex flex-col gap-2.5 transition-colors ${
                isError
                  ? 'bg-red-950/10 border-red-900/20'
                  : isDone
                  ? 'bg-violet-950/10 border-violet-900/20'
                  : isPaused
                  ? 'bg-amber-950/10 border-amber-900/20'
                  : 'bg-white/[0.01] border-white/[0.04]'
              }`}
            >
              {/* Title + action buttons */}
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-sm font-semibold text-slate-200 truncate flex-1" title={item.title}>
                  {item.title}
                </span>

                {item.isResuming && (
                  <span className="text-[10px] font-medium text-amber-400 bg-amber-950/30 border border-amber-800/30 px-1.5 py-0.5 rounded shrink-0">
                    Resuming
                  </span>
                )}

                {isDone || isError ? (
                  <button
                    onClick={() => onDismiss(item.id)}
                    title="Dismiss"
                    className="text-zinc-600 hover:text-zinc-400 shrink-0 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : isPaused ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => onResume(item.id)}
                      title="Resume download"
                      className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 border border-emerald-900/30 bg-emerald-950/30 hover:bg-emerald-900/40 px-2.5 py-1 rounded-lg transition-all"
                    >
                      <Play className="h-3.5 w-3.5" /> Resume
                    </button>
                    <button
                      onClick={() => onCancel(item.id)}
                      title="Cancel download"
                      className="flex items-center gap-1 text-xs text-zinc-500 hover:text-red-400 border border-zinc-800 hover:border-red-900/40 px-2 py-1 rounded-lg transition-all"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.status === 'downloading' && (
                      <button
                        onClick={() => onPause(item.id)}
                        title="Pause download"
                        className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 border border-amber-900/30 bg-amber-950/30 hover:bg-amber-900/40 px-2.5 py-1 rounded-lg transition-all"
                      >
                        <Pause className="h-3.5 w-3.5" /> Pause
                      </button>
                    )}
                    <button
                      onClick={() => onCancel(item.id)}
                      title="Cancel download"
                      className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 border border-red-900/30 bg-red-950/30 hover:bg-red-900/40 px-2.5 py-1 rounded-lg transition-all"
                    >
                      <X className="h-3.5 w-3.5" /> Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Progress bar */}
              {isDone ? (
                <div className="h-1.5 w-full rounded-full bg-zinc-950 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-violet-600 to-pink-500 animate-pulse rounded-full w-full" />
                </div>
              ) : (
                <Progress
                  value={item.progress}
                  className="h-1.5 bg-zinc-950"
                  style={{ backgroundColor: isError ? 'rgba(239,68,68,0.12)' : isPaused ? 'rgba(245,158,11,0.08)' : undefined }}
                />
              )}

              {/* Stats row */}
              <div className="flex justify-between items-center text-xs">
                <span
                  className={`font-medium ${
                    isError
                      ? 'text-red-400'
                      : isDone
                      ? 'text-violet-400'
                      : isPaused
                      ? 'text-amber-400'
                      : 'text-zinc-400'
                  }`}
                >
                  {isDone
                    ? 'Download complete'
                    : isError
                    ? 'Download failed'
                    : item.status === 'pausing'
                    ? 'Pausing...'
                    : item.status === 'paused'
                    ? 'Paused — click Resume to continue'
                    : item.status === 'starting'
                    ? 'Fetching video info...'
                    : item.phase >= 2
                    ? `Downloading audio stream · ${item.speed}`
                    : `Downloading video · ${item.speed}`}
                </span>
                {item.status === 'downloading' && (
                  <div className="flex items-center gap-3 text-zinc-500 shrink-0">
                    <span>
                      {item.total !== '—' ? `${item.downloaded} / ${item.total}` : item.downloaded}
                    </span>
                    <span>ETA {item.eta}</span>
                    <span className="text-zinc-200 font-bold tabular-nums">{item.progress}%</span>
                  </div>
                )}
              </div>

              {isError && item.error && (
                <p className="text-[11px] text-red-400 bg-red-950/20 border border-red-900/30 px-2.5 py-1.5 rounded-lg leading-snug">
                  {item.error}
                </p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
