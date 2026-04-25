import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Truck } from 'lucide-react';
import { agentsApi } from '@/api/agents.api';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { useSocket } from '@/hooks/useSocket';
import { STATUS_COLORS, AGENT_STATUS_LABELS } from '@/lib/constants';
import { cn } from '@/lib/utils';

function AgentStatusBadge({ status }) {
  const colorClass = STATUS_COLORS[status] || 'bg-gray-100 text-gray-600';
  const label = AGENT_STATUS_LABELS[status] || status;
  const isBusy = status === 'busy';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        colorClass
      )}
    >
      {isBusy && <Truck className="h-3 w-3" />}
      {label}
    </span>
  );
}

export default function AgentsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: () => agentsApi.list({ page: 1, limit: 100 }),
  });

  const agents = data?.data?.data || [];

  const handleSocketEvent = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['agents'] });
  }, [queryClient]);

  useSocket('agent:statusChanged', handleSocketEvent);

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.name}</p>
          <p className="text-xs text-gray-400">{row.phone}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <AgentStatusBadge status={row.status} />,
    },
    {
      key: 'createdAt',
      header: 'Joined',
      render: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
  ];

  const available = agents.filter((a) => a.status === 'available').length;
  const busy = agents.filter((a) => a.status === 'busy').length;
  const offline = agents.filter((a) => a.status === 'unavailable').length;

  return (
    <div>
      <PageHeader
        title="Agents"
        description="Manage your delivery agents"
        action={
          <Button asChild>
            <Link to="/agents/new">+ New Agent</Link>
          </Button>
        }
      />

      {agents.length > 0 && (
        <div className="flex gap-4 mb-5 text-sm text-gray-500">
          <span>
            <span className="font-semibold text-green-700">{available}</span> available
          </span>
          <span>
            <span className="font-semibold text-amber-700">{busy}</span> on delivery
          </span>
          <span>
            <span className="font-semibold text-gray-500">{offline}</span> offline
          </span>
        </div>
      )}

      <DataTable
        columns={columns}
        data={agents}
        isLoading={isLoading}
        emptyMessage="No agents found. Create your first agent to get started."
      />
    </div>
  );
}
