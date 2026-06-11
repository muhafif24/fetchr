import { Download, X } from 'lucide-react';
import { Button } from './ui/button';

export interface PlaylistEntry {
  index: number;
  id: string;
  title: string;
  url: string;
  duration: string;
}

export interface PlaylistInfo {
  title: string;
  uploader: string;
  count: number;
  entries: PlaylistEntry[];
}

interface Props {
  playlistInfo: PlaylistInfo;
  selectedEntries: Set<string>;
  onToggleEntry: (id: string) => void;
  onSelectAll: (all: boolean) => void;
  onAddToQueue: () => void;
  onClose: () => void;
}

export function PlaylistModal({
  playlistInfo,
  selectedEntries,
  onToggleEntry,
  onSelectAll,
  onAddToQueue,
  onClose,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#141414] border border-[#242424] rounded-xl shadow-2xl flex flex-col mx-4 max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-[#242424] flex justify-between items-start gap-4 shrink-0">
          <div>
            <h3 className="text-base font-bold text-neutral-100 leading-snug">{playlistInfo.title}</h3>
            <p className="text-xs text-neutral-500 mt-1">
              {playlistInfo.uploader && <span className="mr-3">by {playlistInfo.uploader}</span>}
              <span>{playlistInfo.count} videos</span>
            </p>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-100 transition-colors shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Select All / Count */}
        <div className="px-5 py-3 border-b border-[#242424] flex justify-between items-center shrink-0">
          <span className="text-xs text-neutral-500">
            {selectedEntries.size} of {playlistInfo.count} selected
          </span>
          <div className="flex gap-3">
            <button
              onClick={() => onSelectAll(true)}
              className="text-xs text-rose-400 hover:text-rose-300 transition-colors"
            >
              Select All
            </button>
            <span className="text-neutral-700">·</span>
            <button
              onClick={() => onSelectAll(false)}
              className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              Deselect All
            </button>
          </div>
        </div>

        {/* Entry List */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1">
          {playlistInfo.entries.map((entry) => (
            <div
              key={entry.id}
              onClick={() => onToggleEntry(entry.id)}
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors select-none ${
                selectedEntries.has(entry.id)
                  ? 'bg-rose-950/20 border border-rose-500/20'
                  : 'bg-[#1a1a1a]/30 border border-[#242424]/40 hover:bg-[#1a1a1a]'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedEntries.has(entry.id)}
                onChange={() => onToggleEntry(entry.id)}
                onClick={(e) => e.stopPropagation()}
                className="h-4 w-4 rounded accent-rose-500 shrink-0 cursor-pointer"
              />
              <span className="text-[11px] text-neutral-600 w-6 text-right shrink-0">{entry.index}</span>
              <span className="flex-1 text-sm text-neutral-300 truncate" title={entry.title}>
                {entry.title}
              </span>
              {entry.duration !== '00:00' && (
                <span className="text-[11px] text-neutral-500 shrink-0">{entry.duration}</span>
              )}
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-[#242424] flex justify-end gap-3 shrink-0">
          <Button
            variant="secondary"
            onClick={onClose}
            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-[#242424] text-xs h-9 px-4"
          >
            Cancel
          </Button>
          <Button
            onClick={onAddToQueue}
            disabled={selectedEntries.size === 0}
            className="bg-rose-500 hover:bg-rose-600 disabled:opacity-40 text-white font-semibold text-xs h-9 px-5 transition-all"
          >
            <Download className="mr-2 h-3.5 w-3.5" />
            Add {selectedEntries.size} to Queue
          </Button>
        </div>
      </div>
    </div>
  );
}
