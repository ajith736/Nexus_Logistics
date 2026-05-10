import { useState, useCallback, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useToast } from '@/store/toast.store';
import { ordersApi } from '@/api/orders.api';
import { agentsApi } from '@/api/agents.api';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import DateRangeFilter from '@/components/shared/DateRangeFilter';
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

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: 'created', label: 'Created' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'out_for_delivery', label: 'Out for Delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'failed', label: 'Failed' },
];

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

export default function OrdersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [statusFilter, setStatusFilter] = useState('');
  const [agentFilter, setAgentFilter] = useState('');
  const [page, setPage] = useState(1);
  const [{ startDate, endDate }, setRange] = useState(defaultMonthRange);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkAgentId, setBulkAgentId] = useState('');

  const listParams = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      ...(statusFilter && { status: statusFilter }),
      ...(agentFilter && { assignedTo: agentFilter }),
      ...(startDate && { createdFrom: startDate }),
      ...(endDate && { createdTo: endDate }),
    }),
    [page, statusFilter, agentFilter, startDate, endDate]
  );

  const { data, isLoading } = useQuery({
    queryKey: ['orders', 'list', listParams],
    queryFn: () => ordersApi.list(listParams),
  });

  const { data: agentsData } = useQuery({
    queryKey: ['agents'],
    queryFn: () => agentsApi.list({ page: 1, limit: 100 }),
  });

  const orders = data?.data?.data || [];
  const total = data?.data?.pagination?.total || 0;
  const pages = Math.ceil(total / PAGE_SIZE) || 1;
  const agents = agentsData?.data?.data || [];

  useEffect(() => {
    setSelectedIds([]);
  }, [statusFilter, agentFilter, page, startDate, endDate]);

  const handleSocketEvent = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['orders'] });
  }, [queryClient]);

  useSocket('order:statusChanged', handleSocketEvent);

  const bulkMutation = useMutation({
    mutationFn: () =>
      ordersApi.bulkAssign({ orderIds: selectedIds, agentId: bulkAgentId }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setSelectedIds([]);
      setBulkAgentId('');
      const responseData = res?.data?.data;
      const count = responseData?.count ?? selectedIds.length;
      const conflictCount = responseData?.conflicts?.length ?? 0;

      if (conflictCount > 0) {
        toast.error(
          `${count} assigned, ${conflictCount} already assigned by another dispatcher.`
        );
      } else {
        toast.success(`${count} order${count !== 1 ? 's' : ''} assigned successfully.`);
      }
    },
    onError: (err) => {
      const data = err?.response?.data;
      const isConflict = err?.response?.status === 409 || data?.errorCode === 'ASSIGNMENT_CONFLICT';
      if (isConflict) {
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        setSelectedIds([]);
        setBulkAgentId('');
        toast.error(data?.message || 'All selected orders were already assigned by another dispatcher.');
      } else {
        toast.error(data?.message || 'Bulk assign failed.');
      }
    },
  });

  const handleStatusChange = (val) => {
    setStatusFilter(val === '_all' ? '' : val);
    setPage(1);
  };

  const handleAgentChange = (val) => {
    setAgentFilter(val === '_all' ? '' : val);
    setPage(1);
  };

  const toggleRow = (id) => {
    setSelectedIds((prev) => {
      const s = new Set(prev.map(String));
      const sid = String(id);
      if (s.has(sid)) s.delete(sid);
      else s.add(sid);
      return [...s];
    });
  };

  const toggleAllPage = (pageIds) => {
    setSelectedIds((prev) => {
      const set = new Set(prev.map(String));
      const allSelected = pageIds.length > 0 && pageIds.every((pid) => set.has(pid));
      if (allSelected) pageIds.forEach((pid) => set.delete(pid));
      else pageIds.forEach((pid) => set.add(pid));
      return [...set];
    });
  };

  const selectedOnPage = orders.filter((o) => selectedIds.includes(String(o._id)));
  const canBulkAssign =
    selectedOnPage.length > 0 &&
    selectedOnPage.every((o) => ['created', 'pending', 'failed'].includes(o.status));

  const columns = [
    {
      key: 'orderId',
      header: 'Order ID',
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-gray-700">{row.orderId}</span>
      ),
    },
    {
      key: 'customerName',
      header: 'Customer',
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.customerName}</p>
          <p className="text-xs text-gray-400">{row.customerPhone}</p>
        </div>
      ),
    },
    {
      key: 'customerAddress',
      header: 'Address',
      render: (row) => (
        <span className="text-xs text-gray-600 line-clamp-2 max-w-xs">{row.customerAddress}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'assignedTo',
      header: 'Agent',
      render: (row) =>
        row.assignedTo ? (
          <span className="text-sm">{row.assignedTo.name}</span>
        ) : (
          <span className="text-xs text-gray-400 italic">Unassigned</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (row) => (
        <Button size="sm" variant="outline" onClick={() => navigate(`/orders/${row._id}`)}>
          View
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Orders"
        description={`${total} order${total !== 1 ? 's' : ''} in selected date range`}
        action={
          <Button asChild>
            <Link to="/orders/new">+ New Order</Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-4 mb-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={(v) => {
              setRange((r) => ({ ...r, startDate: v }));
              setPage(1);
            }}
            onEndDateChange={(v) => {
              setRange((r) => ({ ...r, endDate: v }));
              setPage(1);
            }}
          />
          <button
            type="button"
            onClick={() => {
              setRange(defaultMonthRange());
              setPage(1);
            }}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Reset to this month
          </button>
        </div>

        <div className="flex flex-wrap gap-3">
          <Select value={statusFilter || '_all'} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All statuses</SelectItem>
              {STATUS_OPTIONS.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={agentFilter || '_all'} onValueChange={handleAgentChange}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All agents" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All agents</SelectItem>
              {agents.map((a) => (
                <SelectItem key={a._id} value={a._id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50/80 p-4 sm:flex-row sm:items-end sm:justify-between">
          <p className="text-sm text-gray-700">
            <span className="font-semibold text-gray-900">{selectedIds.length}</span> selected
            {!canBulkAssign && selectedOnPage.length > 0 && (
              <span className="block text-xs text-amber-800 mt-1">
                Bulk assign only works for orders in <strong>Created</strong>, <strong>Pending</strong>, or <strong>Failed</strong> status.
              </span>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={bulkAgentId || undefined}
              onValueChange={(v) => setBulkAgentId(v)}
            >
              <SelectTrigger className="w-52 bg-white">
                <SelectValue placeholder="Select agent…" />
              </SelectTrigger>
              <SelectContent>
                {agents.map((a) => (
                  <SelectItem key={a._id} value={a._id}>
                    {a.name}
                    {a.status !== 'available' ? ` (${a.status})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ConfirmDialog
              trigger={
                <Button
                  disabled={
                    !bulkAgentId || !canBulkAssign || bulkMutation.isPending || selectedIds.length === 0
                  }
                >
                  {bulkMutation.isPending ? 'Assigning…' : 'Assign to agent'}
                </Button>
              }
              title="Assign orders to agent"
              description={`Assign ${selectedIds.length} order(s) to the selected agent. Only valid orders will be processed; each must be Created or Pending.`}
              confirmLabel="Assign all"
              onConfirm={() => bulkMutation.mutate()}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedIds([]);
                setBulkAgentId('');
              }}
            >
              Clear selection
            </Button>
          </div>
          {bulkMutation.isError && (
            <p className="text-xs text-red-600 sm:w-full">
              {bulkMutation.error?.response?.data?.message || 'Bulk assign failed.'}
            </p>
          )}
        </div>
      )}

      <DataTable
        selectable
        selectedIds={selectedIds}
        onToggleRow={toggleRow}
        onToggleAllPage={toggleAllPage}
        columns={columns}
        data={orders}
        isLoading={isLoading}
        emptyMessage="No orders match your filters."
      />

      {pages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
          <span>
            Showing {Math.min((page - 1) * PAGE_SIZE + 1, total)}–{Math.min(page * PAGE_SIZE, total)} of{' '}
            {total}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
