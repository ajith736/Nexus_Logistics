import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export default function DateRangeFilter({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  className,
  disabled,
}) {
  return (
    <div className={cn('flex flex-wrap items-end gap-4', className)}>
      <div className="space-y-1.5">
        <Label htmlFor="date-range-start" className="text-xs text-gray-500">
          Start date
        </Label>
        <input
          id="date-range-start"
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          disabled={disabled}
          className="flex h-9 w-40 rounded-md border border-gray-200 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="date-range-end" className="text-xs text-gray-500">
          End date
        </Label>
        <input
          id="date-range-end"
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          disabled={disabled}
          className="flex h-9 w-40 rounded-md border border-gray-200 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50"
        />
      </div>
    </div>
  );
}
