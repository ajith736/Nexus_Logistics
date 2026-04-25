import { cn } from '@/lib/utils';

export default function DataTable({
  columns,
  data,
  isLoading,
  emptyMessage = 'No records found.',
  selectable = false,
  idKey = '_id',
  selectedIds = [],
  onToggleRow,
  onToggleAllPage,
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
        Loading…
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
        {emptyMessage}
      </div>
    );
  }

  const pageIds = data.map((row) => String(row[idKey]));
  const selectedSet = new Set(selectedIds.map(String));
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedSet.has(id));

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {selectable && (
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={allPageSelected}
                  onChange={() => onToggleAllPage?.(pageIds)}
                  aria-label="Select all on this page"
                />
              </th>
            )}
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide',
                  col.headerClassName
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {data.map((row, i) => {
            const rowId = String(row[idKey] ?? i);
            const isSelected = selectedSet.has(rowId);
            return (
              <tr key={row._id || row.id || i} className="hover:bg-gray-50 transition-colors">
                {selectable && (
                  <td className="w-10 px-3 py-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={isSelected}
                      onChange={() => onToggleRow?.(rowId)}
                      aria-label={`Select order ${row.orderId || rowId}`}
                    />
                  </td>
                )}
                {columns.map((col) => (
                  <td key={col.key} className={cn('px-4 py-3 text-gray-700', col.className)}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
