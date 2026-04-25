import { useToastStore } from '@/store/toast.store';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const VARIANTS = {
  success: {
    bar: 'bg-green-500',
    icon: CheckCircle2,
    iconClass: 'text-green-500',
    bg: 'bg-white',
    border: 'border-green-100',
  },
  error: {
    bar: 'bg-red-500',
    icon: AlertCircle,
    iconClass: 'text-red-500',
    bg: 'bg-white',
    border: 'border-red-100',
  },
  default: {
    bar: 'bg-blue-500',
    icon: Info,
    iconClass: 'text-blue-500',
    bg: 'bg-white',
    border: 'border-blue-100',
  },
};

function Toast({ id, message, variant = 'default' }) {
  const removeToast = useToastStore((s) => s.removeToast);
  const cfg = VARIANTS[variant] || VARIANTS.default;
  const Icon = cfg.icon;

  return (
    <div
      className={cn(
        'relative flex items-start gap-3 rounded-xl border shadow-lg px-4 py-3 pr-9 min-w-[280px] max-w-sm',
        cfg.bg,
        cfg.border,
        'animate-in slide-in-from-right-4 fade-in duration-200'
      )}
    >
      <div className={cn('absolute left-0 top-0 bottom-0 w-1 rounded-l-xl', cfg.bar)} />
      <Icon className={cn('h-4 w-4 shrink-0 mt-0.5', cfg.iconClass)} />
      <p className="text-sm text-gray-800 leading-snug">{message}</p>
      <button
        onClick={() => removeToast(id)}
        className="absolute top-2.5 right-2.5 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 items-end pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <Toast {...t} />
        </div>
      ))}
    </div>
  );
}
