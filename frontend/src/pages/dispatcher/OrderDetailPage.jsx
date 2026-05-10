import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/store/toast.store';
import { ArrowLeft, User, MapPin, Phone, Package, Clock } from 'lucide-react';
import { ordersApi } from '@/api/orders.api';
import { agentsApi } from '@/api/agents.api';
import StatusBadge from '@/components/shared/StatusBadge';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSocket } from '@/hooks/useSocket';

const VALID_NEXT = {
  created: ['assigned', 'failed'],
  pending: ['assigned', 'failed'],
  assigned: ['out_for_delivery', 'failed'],
  out_for_delivery: ['delivered', 'failed'],
  delivered: [],
  failed: [],
};

const REASSIGNABLE = ['created', 'pending', 'failed'];

const STATUS_LABELS = {
  created: 'Created',
  pending: 'Pending',
  assigned: 'Assigned',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  failed: 'Failed',
};

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <Icon className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
        <p className="text-sm text-gray-900 break-words">{value || '—'}</p>
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
          {log.toStatus ? STATUS_LABELS[log.toStatus] || log.toStatus : '—'}
        </p>
        {log.fromStatus && (
          <p className="text-xs text-gray-400">from {STATUS_LABELS[log.fromStatus] || log.fromStatus}</p>
        )}
        <p className="text-xs text-gray-400 mt-0.5">
          {new Date(log.createdAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const toast = useToast();
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [pendingStatus, setPendingStatus] = useState('');
  const [conflictBanner, setConflictBanner] = useState(null); // { agentName, agentPhone }

  const { data, isLoading, error } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.get(id),
  });

  const { data: agentsData } = useQuery({
    queryKey: ['agents'],
    queryFn: () => agentsApi.list({ page: 1, limit: 100 }),
  });

  const order = data?.data?.data;
  const statusLogs = order?.statusLogs || [];
  const allAgents = agentsData?.data?.data || [];

  // Clear conflict banner once the order refreshes and is no longer in an assignable state.
  useEffect(() => {
    if (conflictBanner && order && !['created', 'pending', 'failed'].includes(order.status)) {
      setConflictBanner(null);
    }
  }, [order?.status, conflictBanner]);

  const invalidateOrder = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['order', id] });
    queryClient.invalidateQueries({ queryKey: ['orders'] });
  }, [queryClient, id]);

  useSocket('order:statusChanged', invalidateOrder);

  const assignMutation = useMutation({
    mutationFn: () => ordersApi.assign(id, selectedAgentId, order?.version),
    onSuccess: () => {
      invalidateOrder();
      setSelectedAgentId('');
      toast.success('Agent assigned successfully.');
    },
    onError: (err) => {
      const data = err?.response?.data;
      const isConflict = err?.response?.status === 409 || data?.errorCode === 'ASSIGNMENT_CONFLICT';

      if (isConflict) {
        const agentName = data?.details?.assignedAgentName;
        const agentPhone = data?.details?.assignedAgentPhone;
        const dispatcherName = data?.details?.assignedByName;
        const dispatcherEmail = data?.details?.assignedByEmail;
        const conflictMsg =
          agentName && dispatcherName
            ? `Order was already assigned to ${agentName} by ${dispatcherName}.`
            : agentName
            ? `Order was already assigned to ${agentName} by another dispatcher.`
            : 'Order was already assigned by another dispatcher.';
        toast.error(conflictMsg);
        setConflictBanner({ agentName, agentPhone, dispatcherName, dispatcherEmail });
        // Refresh so dispatcher immediately sees the real current state.
        invalidateOrder();
        setSelectedAgentId('');
      } else {
        toast.error(data?.message || 'Failed to assign agent.');
      }
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status) => ordersApi.updateStatus(id, status),
    onSuccess: (_, newStatus) => {
      invalidateOrder();
      setPendingStatus('');
      toast.success(`Status updated to "${STATUS_LABELS[newStatus] || newStatus}".`);
    },
    onError: (err) => {
      setPendingStatus('');
      toast.error(err?.response?.data?.message || 'Failed to update status.');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
        Loading order…
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-gray-500 text-sm">Order not found.</p>
        <Button variant="outline" onClick={() => navigate('/orders')}>
          Back to Orders
        </Button>
      </div>
    );
  }

  const canAssign = REASSIGNABLE.includes(order.status);
  const nextStatuses = VALID_NEXT[order.status] || [];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/orders')}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Orders
        </Button>
        <span className="text-gray-300">/</span>
        <span className="font-mono text-sm font-semibold text-gray-700">{order.orderId}</span>
        <StatusBadge status={order.status} className="ml-1" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Order info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
              Order Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
              <InfoRow icon={Package} label="Order ID" value={order.orderId} />
              <InfoRow icon={Package} label="Sale Order ID" value={order.saleOrderId} />
              <InfoRow icon={User} label="Customer Name" value={order.customerName} />
              <InfoRow icon={Phone} label="Customer Phone" value={order.customerPhone} />
              <InfoRow icon={MapPin} label="Delivery Address" value={order.customerAddress} />
              <InfoRow icon={Package} label="Package Details" value={order.packageDetails} />
            </div>
          </div>

          {/* Conflict banner — shown when this dispatcher lost an assignment race */}
          {conflictBanner && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-3">
              <div className="mt-0.5 h-4 w-4 shrink-0 text-red-500">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-11.25a.75.75 0 011.5 0v4.5a.75.75 0 01-1.5 0v-4.5zm.75 7.5a.75.75 0 110-1.5.75.75 0 010 1.5z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-red-800">Assignment conflict</p>
                <p className="text-sm text-red-700 mt-0.5">
                  Another dispatcher assigned this order first.
                  {conflictBanner.agentName && (
                    <>
                      {' '}
                      Delivery agent: <strong>{conflictBanner.agentName}</strong>
                      {conflictBanner.agentPhone && <> ({conflictBanner.agentPhone})</>}.
                    </>
                  )}
                  {conflictBanner.dispatcherName && (
                    <>
                      {' '}
                      Assigned by: <strong>{conflictBanner.dispatcherName}</strong>
                      {conflictBanner.dispatcherEmail && (
                        <> ({conflictBanner.dispatcherEmail})</>
                      )}.
                    </>
                  )}
                </p>
                <p className="text-xs text-red-500 mt-1">The page has been refreshed to show the latest state.</p>
              </div>
              <button
                onClick={() => setConflictBanner(null)}
                className="text-red-400 hover:text-red-600 text-lg leading-none shrink-0"
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          )}

          {/* Assigned Agent */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
              {order.status === 'failed' ? 'Re-assign Agent' : 'Assigned Agent'}
            </h2>
            {order.status === 'failed' && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
                This order failed. You can re-assign it to an available agent — it will return to <strong>Assigned</strong> status.
              </p>
            )}
            {order.assignedTo ? (
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
                  {order.assignedTo.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{order.assignedTo.name}</p>
                  <p className="text-sm text-gray-400">{order.assignedTo.phone}</p>
                  {order.assignedBy && (
                    <p className="text-xs text-gray-500 mt-1">
                      Assigned by{' '}
                      <span className="font-medium text-gray-700">{order.assignedBy.name}</span>
                      {order.assignedBy.email && (
                        <span className="text-gray-400"> ({order.assignedBy.email})</span>
                      )}
                    </p>
                  )}
                  {order.status === 'failed' && (
                    <p className="text-xs text-gray-400 italic mt-0.5">Previously assigned</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">No agent assigned yet.</p>
            )}

            {canAssign && (
              <div className="mt-4 flex gap-3 items-center">
                <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {allAgents.length === 0 ? (
                      <SelectItem value="_none" disabled>
                        No agents in your organisation
                      </SelectItem>
                    ) : (
                      allAgents.map((a) => (
                        <SelectItem key={a._id} value={a._id}>
                          {a.name}
                          {a.status !== 'available' ? ` · ${a.status}` : ''}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <ConfirmDialog
                  trigger={
                    <Button
                      disabled={!selectedAgentId || assignMutation.isPending}
                      size="sm"
                    >
                      {assignMutation.isPending
                        ? 'Assigning…'
                        : order.status === 'failed'
                        ? 'Re-assign Agent'
                        : 'Assign Agent'}
                    </Button>
                  }
                  title={order.status === 'failed' ? 'Re-assign Failed Order' : 'Assign Agent'}
                  description={
                    order.status === 'failed'
                      ? `Re-assign this failed order to the selected agent? The status will return to "Assigned" and the agent will attempt delivery again.`
                      : `Assign this order to the selected agent? The order status will change to "Assigned".`
                  }
                  confirmLabel={order.status === 'failed' ? 'Re-assign' : 'Assign'}
                  onConfirm={() => assignMutation.mutate()}
                />
              </div>
            )}
            {assignMutation.isError && (
              <p className="mt-2 text-xs text-red-600">
                {assignMutation.error?.response?.data?.message || 'Failed to assign agent.'}
              </p>
            )}
          </div>

          {/* Update Status */}
          {nextStatuses.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                Update Status
              </h2>
              <div className="flex flex-wrap gap-2">
                {nextStatuses.map((s) => (
                  <ConfirmDialog
                    key={s}
                    trigger={
                      <Button
                        variant={s === 'failed' ? 'destructive' : 'default'}
                        size="sm"
                        disabled={statusMutation.isPending}
                      >
                        {statusMutation.isPending && pendingStatus === s
                          ? 'Updating…'
                          : STATUS_LABELS[s] || s}
                      </Button>
                    }
                    title={`Set to "${STATUS_LABELS[s]}"`}
                    description={`Change this order's status to "${STATUS_LABELS[s]}". This action will be logged.`}
                    confirmLabel="Confirm"
                    destructive={s === 'failed'}
                    onConfirm={() => {
                      setPendingStatus(s);
                      statusMutation.mutate(s);
                    }}
                  />
                ))}
              </div>
              {statusMutation.isError && (
                <p className="mt-2 text-xs text-red-600">
                  {statusMutation.error?.response?.data?.message || 'Failed to update status.'}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right: Status timeline */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 h-fit">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400" />
            Status Timeline
          </h2>
          {statusLogs.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No history yet.</p>
          ) : (
            <div>
              {statusLogs.map((log, i) => (
                <TimelineItem key={log._id} log={log} isLast={i === statusLogs.length - 1} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
