import { Download, X, CheckCircle, AlertCircle, Cpu } from 'lucide-react';
import { Button } from './ui/button';

type Phase = 'idle' | 'downloading' | 'extracting' | 'done' | 'error';

interface Props {
  phase: Phase;
  progress: number;
  error: string | null;
  onDownload: () => void;
  onDismiss: () => void;
}

const FEATURE_LIST = [
  'Merge separate video + audio streams (1080p / 4K)',
  'Extract audio as MP3',
  'Embed subtitles into video',
];

export function FFmpegSetupModal({ phase, progress, error, onDownload, onDismiss }: Props) {
  const isActive = phase === 'downloading' || phase === 'extracting';

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#141414] border border-[#242424] rounded-2xl p-8 w-[420px] shadow-2xl">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
              <Cpu className="h-5 w-5 text-rose-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-100">FFmpeg Required</h2>
              <p className="text-xs text-neutral-500 mt-0.5">~90 MB download · one-time setup</p>
            </div>
          </div>
          {!isActive && (
            <button onClick={onDismiss} className="text-neutral-600 hover:text-neutral-400 transition-colors mt-0.5">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Feature list */}
        {phase === 'idle' && (
          <div className="mb-6 space-y-2">
            <p className="text-xs text-neutral-500 mb-3">FFmpeg is needed to:</p>
            {FEATURE_LIST.map((f) => (
              <div key={f} className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-rose-500 shrink-0" />
                <span className="text-xs text-neutral-400">{f}</span>
              </div>
            ))}
            <p className="text-xs text-neutral-600 mt-3 pt-3 border-t border-[#242424]">
              Saved to <span className="text-neutral-500 font-mono">%APPDATA%\Fetchr\bin\</span> — not re-downloaded after app updates.
            </p>
          </div>
        )}

        {/* Progress bar */}
        {(isActive || phase === 'done') && (
          <div className="mb-6 space-y-3">
            <div className="h-1.5 w-full bg-[#0a0a0a] rounded-full overflow-hidden">
              <div
                className="h-full bg-rose-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-xs text-neutral-500">
              <span>
                {phase === 'extracting' ? 'Extracting files...' : phase === 'done' ? 'Complete' : 'Downloading FFmpeg...'}
              </span>
              <span className="tabular-nums font-medium text-neutral-400">{progress}%</span>
            </div>
          </div>
        )}

        {/* Done state */}
        {phase === 'done' && (
          <div className="flex items-center gap-2 mb-6 text-emerald-400">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span className="text-sm">FFmpeg installed successfully.</span>
          </div>
        )}

        {/* Error state */}
        {phase === 'error' && error && (
          <div className="mb-6 p-3 rounded-lg bg-red-950/20 border border-red-900/30 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-400 leading-snug">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          {phase === 'idle' && (
            <>
              <Button
                onClick={onDownload}
                className="flex-1 bg-rose-500 hover:bg-rose-600 text-white text-sm"
              >
                <Download className="h-3.5 w-3.5 mr-2" />
                Download FFmpeg
              </Button>
              <Button
                variant="outline"
                onClick={onDismiss}
                className="bg-transparent border-[#242424] text-neutral-400 hover:bg-[#1a1a1a] text-sm"
              >
                Skip
              </Button>
            </>
          )}

          {isActive && (
            <Button disabled className="flex-1 bg-neutral-800 text-neutral-500 text-sm cursor-not-allowed">
              Downloading... {progress}%
            </Button>
          )}

          {phase === 'done' && (
            <Button onClick={onDismiss} className="flex-1 bg-rose-500 hover:bg-rose-600 text-white text-sm">
              Continue
            </Button>
          )}

          {phase === 'error' && (
            <>
              <Button onClick={onDownload} className="flex-1 bg-rose-500 hover:bg-rose-600 text-white text-sm">
                Retry
              </Button>
              <Button
                variant="outline"
                onClick={onDismiss}
                className="bg-transparent border-[#242424] text-neutral-400 hover:bg-[#1a1a1a] text-sm"
              >
                Skip
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
