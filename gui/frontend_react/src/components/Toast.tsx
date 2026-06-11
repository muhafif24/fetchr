import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'error' | 'success' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

const STYLE: Record<ToastType, { Icon: React.ComponentType<{ className?: string }>; color: string; bar: string }> = {
  error:   { Icon: AlertCircle, color: 'text-red-400',     bar: 'bg-red-500' },
  success: { Icon: CheckCircle, color: 'text-emerald-400', bar: 'bg-emerald-500' },
  info:    { Icon: Info,        color: 'text-rose-400',    bar: 'bg-rose-500' },
};

function Toast({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  const { Icon, color, bar } = STYLE[item.type];
  return (
    <div className="relative overflow-hidden bg-[#141414] border border-[#242424] rounded-lg shadow-2xl pl-3 pr-2 py-3 flex items-start gap-2.5 min-w-[280px] max-w-[380px] animate-in slide-in-from-right-4 fade-in duration-200">
      <Icon className={cn('h-4 w-4 shrink-0 mt-0.5', color)} />
      <p className="flex-1 text-xs text-neutral-200 leading-snug break-words">{item.message}</p>
      <button
        onClick={() => onDismiss(item.id)}
        className="text-neutral-600 hover:text-neutral-300 transition-colors shrink-0"
        title="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      {/* progress bar auto-dismiss */}
      <span className={cn('absolute bottom-0 left-0 h-0.5 animate-toast-bar', bar)} />
    </div>
  );
}

export function ToastContainer({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <Toast item={t} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}
