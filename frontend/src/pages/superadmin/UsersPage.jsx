import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/api/users.api';
import { organizationsApi } from '@/api/organizations.api';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
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

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [orgFilter, setOrgFilter] = useState('all');

  const { data: orgsData } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => organizationsApi.list().then((r) => r.data),
  });
  const orgs = orgsData?.data ?? [];

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users', orgFilter],
    queryFn: () =>
      usersApi
        .list(orgFilter !== 'all' ? { orgId: orgFilter } : {})
        .then((r) => r.data),
  });
  const users = usersData?.data ?? [];

  const deactivateMutation = useMutation({
    mutationFn: (id) => usersApi.deactivate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (row) => <span className="font-medium text-gray-900">{row.name}</span>,
    },
    {
      key: 'email',
      header: 'Email',
      render: (row) => <span className="text-gray-600">{row.email}</span>,
    },
    {
      key: 'org',
      header: 'Organization',
      render: (row) =>
        row.orgId?.name ? (
          <span>{row.orgId.name}</span>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.isActive ? 'active' : 'inactive'} />,
    },
    {
      key: 'createdAt',
      header: 'Joined',
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
      render: (row) =>
        row.isActive ? (
          <ConfirmDialog
            trigger={
              <Button
                variant="outline"
                size="sm"
                disabled={deactivateMutation.isPending}
                className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300 hover:bg-red-50"
              >
                Deactivate
              </Button>
            }
            title="Deactivate User"
            description={`Deactivate "${row.name}" (${row.email})? They will lose access immediately and be signed out.`}
            confirmLabel="Deactivate"
            destructive
            onConfirm={() => deactivateMutation.mutate(row._id)}
          />
        ) : (
          <span className="text-xs text-gray-400 italic">Inactive</span>
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Users"
        description="Manage dispatcher accounts across all organizations"
        action={
          <Link to="/users/new">
            <Button>+ New User</Button>
          </Link>
        }
      />

      <div className="mb-4 flex items-center gap-3">
        <span className="text-sm text-gray-500 shrink-0">Filter by org:</span>
        <Select value={orgFilter} onValueChange={setOrgFilter}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="All organizations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All organizations</SelectItem>
            {orgs.map((org) => (
              <SelectItem key={org._id} value={org._id}>
                {org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {orgFilter !== 'all' && (
          <button
            onClick={() => setOrgFilter('all')}
            className="text-xs text-blue-600 hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={users}
        isLoading={isLoading}
        emptyMessage="No users found. Create one to get started."
      />
    </div>
  );
}
