import { Play, FolderOpen, Trash2, Clock } from 'lucide-react';
import { Button } from './ui/button';

export interface HistoryItem {
  title: string;
  url: string;
  format: string;
  date: string;
  folder: string;
  filename: string;
}

interface Props {
  history: HistoryItem[];
  onPlay: (folder: string, filename: string) => void;
  onOpenFolder: (folder: string) => void;
  onDeleteClick: (index: number, title: string) => void;
  onClearAll?: () => void;
}

function shortFormat(fmt: string): string {
  const f = fmt.toLowerCase();
  if (f.includes('2160') || f.includes('4k'))  return '4K';
  if (f.includes('1440'))                       return '1440p';
  if (f.includes('1080'))                       return '1080p';
  if (f.includes('720'))                        return '720p';
  if (f.includes('480'))                        return '480p';
  if (f.includes('360'))                        return '360p';
  if (f.includes('mp3') || f.includes('audio')) return 'MP3';
  if (f.includes('auto') || f.includes('best')) return 'Auto';
  return fmt;
}

// H3 — human-readable relative date
function relativeDate(dateStr: string): string {
  const date = new Date(dateStr.split(' ')[0]);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7)   return date.toLocaleDateString('en-US', { weekday: 'short' });
  if (diffDays < 365) return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
}

export function HistoryTable({ history, onPlay, onOpenFolder, onDeleteClick, onClearAll }: Props) {
  if (history.length === 0) {
    return (
      <div className="rounded-xl border border-[#242424] bg-[#0d0d0d] px-6 py-10 flex flex-col items-center gap-4 select-none">
        <div className="w-14 h-14 rounded-2xl bg-[#141414] border border-[#242424] flex items-center justify-center">
          <Clock className="h-6 w-6 text-neutral-600" />
        </div>
        <div className="text-center space-y-1.5">
          <p className="text-sm font-medium text-neutral-400">No downloads yet</p>
          <p className="text-xs text-neutral-600">Downloads you complete will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">

      {/* M4 — count + Clear All */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-600">
          {history.length} download{history.length !== 1 ? 's' : ''}
        </span>
        {onClearAll && (
          <button
            onClick={onClearAll}
            className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-400 rounded px-1.5 py-0.5 focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500/40 transition-colors"
          >
            <Trash2 className="h-3 w-3" />
            Clear all
          </button>
        )}
      </div>

      <div className="rounded-lg border border-[#242424] bg-[#141414] overflow-hidden">

        {/* Table header */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[#242424]">
          <span className="flex-1 text-[10px] font-medium text-neutral-600 uppercase tracking-wider">Title</span>
          <span className="w-20 text-[10px] font-medium text-neutral-600 uppercase tracking-wider text-right hidden sm:block">Date</span>
          <span className="w-14 text-[10px] font-medium text-neutral-600 uppercase tracking-wider text-center hidden sm:block">Format</span>
          <span className="w-32" />
        </div>

        {/* M3 — row separator #242424 */}
        <div className="divide-y divide-[#242424]">
          {history.map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-3 px-4 py-3 hover:bg-[#1a1a1a] transition-colors group"
            >
              {/* Title */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-neutral-200 truncate" title={item.title}>
                  {item.title}
                </p>
                {/* Mobile: date + format badge inline under title */}
                <div className="flex items-center gap-2 mt-0.5 sm:hidden">
                  <span className="text-[10px] text-neutral-600">{relativeDate(item.date)}</span>
                  <span className="text-neutral-800">·</span>
                  <span className="text-[10px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded">
                    {shortFormat(item.format)}
                  </span>
                </div>
              </div>

              {/* H3 — relative date */}
              <span className="w-20 text-xs text-neutral-500 text-right hidden sm:block shrink-0">
                {relativeDate(item.date)}
              </span>

              {/* M1 — format badge */}
              <div className="w-14 flex justify-center hidden sm:flex shrink-0" title={item.format}>
                <span className="text-[10px] font-medium bg-neutral-800/80 text-neutral-400 px-1.5 py-0.5 rounded">
                  {shortFormat(item.format)}
                </span>
              </div>

              {/* Actions — Play + Folder selalu terlihat, Trash dipisah divider */}
              <div className="flex items-center shrink-0 w-32 justify-end gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-neutral-500 hover:text-neutral-100 hover:bg-neutral-800"
                  onClick={() => onPlay(item.folder, item.filename)}
                  title="Play"
                >
                  <Play className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-neutral-500 hover:text-neutral-100 hover:bg-neutral-800"
                  onClick={() => onOpenFolder(item.folder)}
                  title="Open folder"
                >
                  <FolderOpen className="h-3.5 w-3.5" />
                </Button>

                {/* Divider memisahkan aksi destructive */}
                <span className="w-px h-4 bg-[#2a2a2a] mx-1 shrink-0" />

                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-neutral-600 hover:text-red-400 hover:bg-red-950/20"
                  onClick={() => onDeleteClick(index, item.title)}
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
