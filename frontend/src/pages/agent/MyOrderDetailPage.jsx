import { useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, User, MapPin, Phone, Package, Clock, Truck, CheckCircle2, XCircle } from 'lucide-react';
import { ordersApi } from '@/api/orders.api';
import StatusBadge from '@/components/shared/StatusBadge';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { useSocket } from '@/hooks/useSocket';
import { useToast } from '@/store/toast.store';

const AGENT_NEXT_STATUSES = {
  assigned: ['out_for_delivery', 'failed'],
  out_for_delivery: ['delivered', 'failed'],
  delivered: [],
  failed: [],
};

const STATUS_LABELS = {
  created: 'Created',
  pending: 'Pending',
  assigned: 'Assigned',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  failed: 'Failed',
};

const STATUS_BUTTON_CONFIG = {
  out_for_delivery: {
    label: 'Start Delivery',
    icon: Truck,
    className: 'bg-purple-600 hover:bg-purple-700 text-white border-purple-600',
  },
  delivered: {
    label: 'Mark Delivered',
    icon: CheckCircle2,
    className: 'bg-green-600 hover:bg-green-700 text-white border-green-600',
  },
  failed: {
    label: 'Mark Failed',
    icon: XCircle,
    className: 'bg-red-600 hover:bg-red-700 text-white border-red-600',
  },
};

function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <Icon className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
        <p className="text-sm text-gray-900 break-words">{value}</p>
      </div>
    </div>
  );
}

function TimelineItem({ log, isLast }) {
  return (
    <div className="relative flex gap-3">
      <div className="flex flex-col items-center">
        <div className="h-2.5 w-2.5 rounded-full bg-blue-500 ring-2 ring-white mt-1 shrink-0" />
        {!isLast && <div className="w-px flex-1 bg-gray-200 mt-1" />}
      </div>
      <div className="pb-4 min-w-0">
        <p className="text-sm font-medium text-gray-900">
          {STATUS_LABELS[log.toStatus] || log.toStatus || '—'}
        </p>
        {log.fromStatus && (
          <p className="text-xs text-gray-400">
            from {STATUS_LABELS[log.fromStatus] || log.fromStatus}
          </p>
        )}
        <p className="text-xs text-gray-400 mt-0.5">
          {new Date(log.createdAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

export default function MyOrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [pendingStatus, setPendingStatus] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['my-order', id],
    queryFn: () => ordersApi.get(id),
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['my-order', id] });
    queryClient.invalidateQueries({ queryKey: ['my-orders'] });
  }, [queryClient, id]);

  useSocket('order:statusChanged', invalidate);

  const statusMutation = useMutation({
    mutationFn: (newStatus) => ordersApi.updateStatus(id, newStatus),
    onMutate: async (newStatus) => {
      await queryClient.cancelQueries({ queryKey: ['my-order', id] });
      const snapshot = queryClient.getQueryData(['my-order', id]);
      queryClient.setQueryData(['my-order', id], (old) => {
        if (!old?.data?.data) return old;
        return { ...old, data: { ...old.data, data: { ...old.data.data, status: newStatus } } };
      });
      return { snapshot };
    },
    onSuccess: (_, newStatus) => {
      invalidate();
      setPendingStatus('');
      const cfg = STATUS_BUTTON_CONFIG[newStatus];
      toast.success(`${cfg?.label || STATUS_LABELS[newStatus] || newStatus} — updated successfully.`);
    },
    onError: (err, _, ctx) => {
      if (ctx?.snapshot) queryClient.setQueryData(['my-order', id], ctx.snapshot);
      setPendingStatus('');
      toast.error(err?.response?.data?.message || 'Failed to update status.');
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-32 rounded-lg bg-gray-100 animate-pulse" />
        <div className="h-48 rounded-2xl bg-gray-100 animate-pulse" />
        <div className="h-32 rounded-2xl bg-gray-100 animate-pulse" />
      </div>
    );
  }

  if (error || !data?.data?.data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-gray-500 text-sm">Order not found.</p>
        <Button variant="outline" onClick={() => navigate('/my-orders')}>
          Back to My Orders
        </Button>
      </div>
    );
  }

  const order = data.data.data;
  const statusLogs = order.statusLogs || [];
  const nextStatuses = AGENT_NEXT_STATUSES[order.status] || [];
  const isTerminal = order.status === 'delivered' || order.status === 'failed';

  return (
    <div className="space-y-4">
      {/* Back + header */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/my-orders')}
          className="flex items-center gap-1 text-gray-500 hover:text-gray-800 transition-colors text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          My Orders
        </button>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="font-mono text-base font-bold text-gray-900">{order.orderId}</h1>
          {order.saleOrderId && (
            <p className="text-xs text-gray-400 mt-0.5">Sale ID: {order.saleOrderId}</p>
          )}
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Status update buttons */}
      {nextStatuses.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Update Status
          </p>
          {nextStatuses.map((s) => {
            const cfg = STATUS_BUTTON_CONFIG[s] || {};
            const Icon = cfg.icon;
            const isPending = statusMutation.isPending && pendingStatus === s;

            return (
              <ConfirmDialog
                key={s}
                trigger={
                  <button
                    disabled={statusMutation.isPending}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold border transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${cfg.className}`}
                  >
                    {isPending ? (
                      <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    ) : Icon ? (
                      <Icon className="h-4 w-4" />
                    ) : null}
                    {isPending ? 'Updating…' : cfg.label || STATUS_LABELS[s] || s}
                  </button>
                }
                title={`Confirm: ${cfg.label || STATUS_LABELS[s]}`}
                description={
                  s === 'delivered'
                    ? 'Confirm that this package has been delivered to the customer.'
                    : s === 'out_for_delivery'
                    ? 'Confirm you are starting delivery for this order.'
                    : 'Mark this order as failed? This will notify the dispatcher.'
                }
                confirmLabel={cfg.label || 'Confirm'}
                destructive={s === 'failed'}
                onConfirm={() => {
                  setPendingStatus(s);
                  statusMutation.mutate(s);
                }}
              />
            );
          })}

          {statusMutation.isError && (
            <p className="text-xs text-red-600 text-center pt-1">
              {statusMutation.error?.response?.data?.message || 'Failed to update status.'}
            </p>
          )}
        </div>
      )}

      {isTerminal && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-medium text-center ${
            order.status === 'delivered'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {order.status === 'delivered'
            ? 'Delivery completed successfully.'
            : 'This order was marked as failed.'}
        </div>
      )}

      {/* Delivery info */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Delivery Info
        </p>
        <InfoRow icon={User} label="Customer Name" value={order.customerName} />
        <InfoRow icon={Phone} label="Phone" value={order.customerPhone} />
        <InfoRow icon={MapPin} label="Address" value={order.customerAddress} />
        <InfoRow icon={Package} label="Package Details" value={order.packageDetails} />
      </div>

      {/* Status Timeline */}
      {statusLogs.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            History
          </p>
          {statusLogs.map((log, i) => (
            <TimelineItem key={log._id} log={log} isLast={i === statusLogs.length - 1} />
          ))}
        </div>
      )}
    </div>
  );
}
