import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationsApi } from '@/api/organizations.api';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';

export default function OrgsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => organizationsApi.list().then((r) => r.data),
  });

  const orgs = data?.data ?? [];

  const activateMutation = useMutation({
    mutationFn: (id) => organizationsApi.activate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['organizations'] }),
  });

  const suspendMutation = useMutation({
    mutationFn: (id) => organizationsApi.suspend(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['organizations'] }),
  });

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (row) => <span className="font-medium text-gray-900">{row.name}</span>,
    },
    {
      key: 'slug',
      header: 'Slug',
      render: (row) => (
        <code className="text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-mono">
          {row.slug}
        </code>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (row) =>
        new Date(row.createdAt).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
    },
    {
      key: 'actions',
      header: '',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (row) => {
        const isBusy =
          activateMutation.isPending || suspendMutation.isPending;

        return (
          <div className="flex items-center justify-end gap-2">
            {row.status === 'active' ? (
              <ConfirmDialog
                trigger={
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isBusy}
                    className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300 hover:bg-red-50"
                  >
                    Suspend
                  </Button>
                }
                title="Suspend Organization"
                description={`Suspend "${row.name}"? Dispatchers in this organization will lose access until it is reactivated.`}
                confirmLabel="Suspend"
                destructive
                onConfirm={() => suspendMutation.mutate(row._id)}
              />
            ) : (
              <ConfirmDialog
                trigger={
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isBusy}
                    className="text-green-600 hover:text-green-700 border-green-200 hover:border-green-300 hover:bg-green-50"
                  >
                    Activate
                  </Button>
                }
                title="Activate Organization"
                description={`Activate "${row.name}"? Dispatchers in this organization will regain access.`}
                confirmLabel="Activate"
                onConfirm={() => activateMutation.mutate(row._id)}
              />
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Organizations"
        description="Manage all tenant organizations"
        action={
          <Link to="/orgs/new">
            <Button>+ New Organization</Button>
          </Link>
        }
      />
      <DataTable
        columns={columns}
        data={orgs}
        isLoading={isLoading}
        emptyMessage="No organizations yet. Create one to get started."
      />
    </div>
  );
}
