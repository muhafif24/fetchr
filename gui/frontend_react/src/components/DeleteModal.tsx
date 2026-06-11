import { Button } from './ui/button';

interface Props {
  target: { index: number; title: string };
  deleteFileAlso: boolean;
  onToggleDeleteFile: (v: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteModal({ target, deleteFileAlso, onToggleDeleteFile, onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#141414] border border-[#242424] rounded-xl shadow-2xl p-6 flex flex-col gap-5 mx-4">
        <div>
          <h3 className="text-base font-bold text-neutral-100 leading-snug">Delete History Item</h3>
          <p className="text-xs text-neutral-500 mt-2 line-clamp-2">
            Are you sure you want to delete{' '}
            <span className="text-neutral-200 font-semibold">"{target.title}"</span>?
          </p>
        </div>

        <div
          className="flex items-center gap-3 bg-[#1a1a1a] border border-[#242424] p-3 rounded-lg cursor-pointer select-none"
          onClick={() => onToggleDeleteFile(!deleteFileAlso)}
        >
          <input
            type="checkbox"
            id="deleteFileCheckbox"
            checked={deleteFileAlso}
            onChange={(e) => onToggleDeleteFile(e.target.checked)}
            className="h-4 w-4 rounded accent-rose-500 cursor-pointer"
          />
          <label htmlFor="deleteFileCheckbox" className="text-xs text-neutral-300 font-medium cursor-pointer">
            Also delete the video file from your computer
          </label>
        </div>

        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={onCancel}
            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-[#242424] text-xs h-9 px-4"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-500 text-white font-semibold text-xs h-9 px-4 active:scale-[0.98] transition-all"
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
