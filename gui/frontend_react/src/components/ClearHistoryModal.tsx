import { Trash2, AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';

interface Props {
  count: number;
  deleteFilesAlso: boolean;
  busy?: boolean;
  onToggleDeleteFiles: (v: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ClearHistoryModal({
  count,
  deleteFilesAlso,
  busy = false,
  onToggleDeleteFiles,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#141414] border border-[#242424] rounded-xl shadow-2xl p-6 flex flex-col gap-5 mx-4">

        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
            <Trash2 className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-neutral-100 leading-snug">Clear All History</h3>
            <p className="text-xs text-neutral-500 mt-1">
              Remove all{' '}
              <span className="text-neutral-200 font-semibold">{count}</span>{' '}
              download record{count !== 1 ? 's' : ''} from your history.
            </p>
          </div>
        </div>

        {/* Option: delete files from disk */}
        <div
          className="flex items-center gap-3 bg-[#1a1a1a] border border-[#242424] p-3 rounded-lg cursor-pointer select-none aria-disabled:opacity-50 aria-disabled:pointer-events-none"
          aria-disabled={busy}
          onClick={() => !busy && onToggleDeleteFiles(!deleteFilesAlso)}
        >
          <input
            type="checkbox"
            id="clearDeleteFiles"
            checked={deleteFilesAlso}
            disabled={busy}
            onChange={(e) => onToggleDeleteFiles(e.target.checked)}
            className="h-4 w-4 rounded accent-red-500 cursor-pointer shrink-0"
          />
          <label htmlFor="clearDeleteFiles" className="text-xs text-neutral-300 font-medium cursor-pointer">
            Also delete the video files from your computer
          </label>
        </div>

        {/* Warning when deleting from disk */}
        {deleteFilesAlso ? (
          <div className="flex items-start gap-2 -mt-2 px-1">
            <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-red-400/80 leading-snug">
              Files will be permanently deleted from disk. This cannot be undone.
            </p>
          </div>
        ) : (
          <p className="text-[11px] text-neutral-600 -mt-2 px-1 leading-snug">
            Only the history list is cleared — downloaded files stay on your computer.
          </p>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={onCancel}
            disabled={busy}
            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-[#242424] text-xs h-9 px-4 disabled:opacity-50"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={busy}
            className="bg-red-600 hover:bg-red-500 text-white font-semibold text-xs h-9 px-4 active:scale-[0.98] transition-all disabled:opacity-60 disabled:active:scale-100"
          >
            {busy ? 'Clearing…' : deleteFilesAlso ? 'Delete All & Files' : 'Clear History'}
          </Button>
        </div>
      </div>
    </div>
  );
}
