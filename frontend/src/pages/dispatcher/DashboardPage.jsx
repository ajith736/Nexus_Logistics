import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Hash, Package } from 'lucide-react';
import { ordersApi } from '@/api/orders.api';
import PageHeader from '@/components/shared/PageHeader';
import DateRangeFilter from '@/components/shared/DateRangeFilter';
import StatusBadge from '@/components/shared/StatusBadge';
import { useSocket } from '@/hooks/useSocket';
import { ORDER_STATUSES, STATUS_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';

function toYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function defaultMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return { startDate: toYMD(start), endDate: toYMD(now) };
}

/** Stable display order; excludes legacy `pending` unless you add it back to the product. */
const STATUS_CARD_ORDER = [
  ORDER_STATUSES.CREATED,
  ORDER_STATUSES.ASSIGNED,
  ORDER_STATUSES.OUT_FOR_DELIVERY,
  ORDER_STATUSES.DELIVERED,
  ORDER_STATUSES.FAILED,
];

function StatCard({ title, value, bgClass, iconClass, isLoading }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-3 shadow-sm">
      <div className={cn('h-11 w-11 rounded-lg flex items-center justify-center shrink-0', bgClass)}>
        <Hash className={cn('h-5 w-5', iconClass)} />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-medium text-gray-700 truncate">{title}</p>
        </div>
        <p className="text-2xl font-bold text-gray-900">
          {isLoading ? <span className="text-gray-300">—</span> : (value ?? 0)}
        </p>
      </div>
    </div>
  );
}

function statusTitle(status) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusAccent(status) {
  const badge = STATUS_COLORS[status] || 'bg-gray-100 text-gray-600';
  if (badge.includes('green')) return { bg: 'bg-green-50', icon: 'text-green-600' };
  if (badge.includes('purple')) return { bg: 'bg-purple-50', icon: 'text-purple-600' };
  if (badge.includes('blue')) return { bg: 'bg-blue-50', icon: 'text-blue-600' };
  if (badge.includes('yellow')) return { bg: 'bg-yellow-50', icon: 'text-yellow-700' };
  if (badge.includes('red')) return { bg: 'bg-red-50', icon: 'text-red-600' };
  return { bg: 'bg-gray-50', icon: 'text-gray-600' };
}

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [{ startDate, endDate }, setRange] = useState(defaultMonthRange);

  const statsParams = useMemo(
    () => ({
      ...(startDate && { createdFrom: startDate }),
      ...(endDate && { createdTo: endDate }),
    }),
    [startDate, endDate]
  );

  const listParams = useMemo(
    () => ({
      page: 1,
      limit: 10,
      ...(startDate && { createdFrom: startDate }),
      ...(endDate && { createdTo: endDate }),
    }),
    [startDate, endDate]
  );

  const { data: statsRes, isLoading: statsLoading } = useQuery({
    queryKey: ['orders', 'stats', statsParams],
    queryFn: () => ordersApi.stats(statsParams),
  });

  const { data: recentData, isLoading: recentLoading } = useQuery({
    queryKey: ['orders', 'recent', listParams],
    queryFn: () => ordersApi.list(listParams),
  });

  const stats = statsRes?.data?.data;
  const total = stats?.total ?? 0;
  const byStatus = stats?.byStatus ?? {};

  const extraStatuses = Object.keys(byStatus).filter((s) => !STATUS_CARD_ORDER.includes(s));
  const statusKeys = [...STATUS_CARD_ORDER, ...extraStatuses.sort()];

  const recentOrders = recentData?.data?.data || [];

  const handleOrderUpdate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['orders'] });
  }, [queryClient]);

  useSocket('order:statusChanged', handleOrderUpdate);

  return (
    <div>
      <PageHeader title="Dashboard" description="Overview of your delivery operations" />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={(v) => setRange((r) => ({ ...r, startDate: v }))}
          onEndDateChange={(v) => setRange((r) => ({ ...r, endDate: v }))}
        />
        <button
          type="button"
          onClick={() => setRange(defaultMonthRange())}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium self-start sm:self-auto"
        >
          Reset to this month
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-4">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 p-5 text-white shadow-sm sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-lg bg-white/10 flex items-center justify-center">
              <Package className="h-5 w-5 text-blue-200" />
            </div>
            <div>
              <p className="text-sm text-slate-300">Total (in range)</p>
              <p className="text-3xl font-bold">
                {statsLoading ? <span className="text-slate-500">—</span> : total}
              </p>
            </div>
          </div>
        </div>

        {statusKeys.map((status) => {
          const accent = statusAccent(status);
          return (
            <StatCard
              key={status}
              title={statusTitle(status)}
              value={byStatus[status] ?? 0}
              bgClass={accent.bg}
              iconClass={accent.icon}
              isLoading={statsLoading}
            />
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Recent orders</h2>
          <Link to="/orders" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            View all →
          </Link>
        </div>

        {recentLoading ? (
          <div className="py-12 text-center text-sm text-gray-400">Loading…</div>
        ) : recentOrders.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">No orders in this date range.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentOrders.map((order) => (
              <Link
                key={order._id}
                to={`/orders/${order._id}`}
                className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 font-mono">{order.orderId}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {order.customerName}
                    {order.assignedTo && (
                      <span className="ml-2 text-gray-400">· {order.assignedTo.name}</span>
                    )}
                  </p>
                </div>
                <div className="ml-4 shrink-0">
                  <StatusBadge status={order.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
