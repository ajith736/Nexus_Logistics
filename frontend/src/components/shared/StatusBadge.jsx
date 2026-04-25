import { STATUS_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';

export default function StatusBadge({ status, className }) {
  const colorClass = STATUS_COLORS[status] || 'bg-gray-100 text-gray-600';
  const label = status?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', colorClass, className)}>
      {label}
    </span>
  );
}
