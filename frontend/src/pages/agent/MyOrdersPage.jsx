import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Phone, Package, ChevronRight, ClipboardList, CheckCircle2, Clock } from 'lucide-react';
import { ordersApi } from '@/api/orders.api';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { useSocket } from '@/hooks/useSocket';
import { cn } from '@/lib/utils';

const ACTIVE_ICON_MAP = {
  assigned: { bg: 'bg-blue-50', icon: 'text-blue-500' },
  out_for_delivery: { bg: 'bg-purple-50', icon: 'text-purple-500' },
};
const HISTORY_ICON_MAP = {
  delivered: { bg: 'bg-green-50', icon: 'text-green-500' },
  failed: { bg: 'bg-red-50', icon: 'text-red-400' },
};

function OrderCard({ order, onClick, isHistory }) {
  const iconStyle = isHistory
    ? HISTORY_ICON_MAP[order.status] || { bg: 'bg-gray-50', icon: 'text-gray-400' }
    : ACTIVE_ICON_MAP[order.status] || { bg: 'bg-gray-50', icon: 'text-gray-400' };

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left bg-white rounded-2xl border p-4 flex items-start gap-3 active:scale-[0.98] transition-transform shadow-sm',
        isHistory ? 'border-gray-100 opacity-80' : 'border-gray-200'
      )}
    >
      <div className={cn('h-10 w-10 rounded-full flex items-center justify-center shrink-0 mt-0.5', iconStyle.bg)}>
        <Package className={cn('h-5 w-5', iconStyle.icon)} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="font-mono text-sm font-semibold text-gray-900 truncate">{order.orderId}</span>
          <StatusBadge status={order.status} />
        </div>
        {order.customerName && (
          <p className="text-sm font-medium text-gray-700 truncate">{order.customerName}</p>
        )}
        {order.customerPhone && (
          <div className="flex items-center gap-1.5 mt-1">
            <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <span className="text-xs text-gray-500 truncate">{order.customerPhone}</span>
          </div>
        )}
        {order.customerAddress && (
          <div className="flex items-start gap-1.5 mt-0.5">
            <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0 mt-0.5" />
            <span className="text-xs text-gray-500 line-clamp-2">{order.customerAddress}</span>
          </div>
        )}
      </div>
      <ChevronRight className="h-4 w-4 text-gray-300 shrink-0 mt-1" />
    </button>
  );
}

function EmptyState({ tab }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
      <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center">
        {tab === 'active'
          ? <ClipboardList className="h-8 w-8 text-gray-400" />
          : <CheckCircle2 className="h-8 w-8 text-gray-400" />}
      </div>
      <p className="text-gray-600 font-medium">
        {tab === 'active' ? 'No active orders' : 'No completed orders'}
      </p>
      <p className="text-gray-400 text-sm max-w-[200px]">
        {tab === 'active'
          ? 'You have no active deliveries right now.'
          : 'Delivered and failed orders will appear here.'}
      </p>
    </div>
  );
}

function TabBar({ active, activeCount, historyTotal, onChange }) {
  return (
    <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4">
      {[
        { key: 'active', label: 'Active', icon: Clock, count: activeCount, countBg: 'bg-blue-600 text-white' },
        { key: 'history', label: 'History', icon: CheckCircle2, count: historyTotal, countBg: 'bg-gray-600 text-white' },
      ].map(({ key, label, icon: Icon, count, countBg }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all',
            active === key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
          {count > 0 && (
            <span className={cn(
              'inline-flex items-center justify-center rounded-full text-xs font-semibold px-1.5 min-w-[20px] h-5',
              active === key ? countBg : 'bg-gray-300 text-gray-600'
            )}>
              {count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((n) => <div key={n} className="h-28 rounded-2xl bg-gray-100 animate-pulse" />)}
    </div>
  );
}

const HISTORY_PAGE_SIZE = 20;

export default function MyOrdersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('active');
  const [historyPage, setHistoryPage] = useState(1);

  const {
    data: activeData,
    isLoading: activeLoading,
    error: activeError,
  } = useQuery({
    queryKey: ['my-orders', 'active'],
    queryFn: () => ordersApi.myActiveOrders(),
  });

  const {
    data: historyData,
    isLoading: historyLoading,
    error: historyError,
  } = useQuery({
    queryKey: ['my-orders', 'history', historyPage],
    queryFn: () => ordersApi.myHistoryOrders(historyPage),
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['my-orders'] });
  }, [queryClient]);

  useSocket('order:statusChanged', invalidate);

  const activeOrders = activeData?.data?.data ?? [];
  const historyOrders = historyData?.data?.data ?? [];
  const historyTotal = historyData?.data?.pagination?.total ?? 0;
  const historyPages = Math.ceil(historyTotal / HISTORY_PAGE_SIZE) || 1;

  const isLoading = tab === 'active' ? activeLoading : historyLoading;
  const hasError = tab === 'active' ? activeError : historyError;
  const visibleOrders = tab === 'active' ? activeOrders : historyOrders;

  if (activeLoading && tab === 'active') {
    return (
      <div>
        <div className="mb-4"><h1 className="text-lg font-bold text-gray-900">My Orders</h1></div>
        <div className="h-11 rounded-xl bg-gray-100 animate-pulse mb-4" />
        <SkeletonList />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-lg font-bold text-gray-900">My Orders</h1>
        <p className="text-sm text-gray-500">
          {activeOrders.length > 0
            ? `${activeOrders.length} active deliver${activeOrders.length !== 1 ? 'ies' : 'y'}`
            : 'No active deliveries'}
        </p>
      </div>

      <TabBar
        active={tab}
        activeCount={activeOrders.length}
        historyTotal={historyTotal}
        onChange={(t) => { setTab(t); if (t === 'history') setHistoryPage(1); }}
      />

      {hasError ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2 text-center">
          <p className="text-red-500 text-sm font-medium">Failed to load orders.</p>
          <button onClick={invalidate} className="text-blue-600 text-sm underline underline-offset-2">
            Retry
          </button>
        </div>
      ) : isLoading ? (
        <SkeletonList />
      ) : visibleOrders.length === 0 ? (
        <EmptyState tab={tab} />
      ) : (
        <>
          <div className="space-y-3">
            {visibleOrders.map((order) => (
              <OrderCard
                key={order._id}
                order={order}
                isHistory={tab === 'history'}
                onClick={() => navigate(`/my-orders/${order._id}`)}
              />
            ))}
          </div>

          {tab === 'history' && historyPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
              <span>
                {Math.min((historyPage - 1) * HISTORY_PAGE_SIZE + 1, historyTotal)}–
                {Math.min(historyPage * HISTORY_PAGE_SIZE, historyTotal)} of {historyTotal}
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={historyPage === 1}
                  onClick={() => setHistoryPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={historyPage >= historyPages}
                  onClick={() => setHistoryPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
