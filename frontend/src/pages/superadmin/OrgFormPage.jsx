import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationsApi } from '@/api/organizations.api';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function OrgFormPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [createdOrg, setCreatedOrg] = useState(null);

  const { mutate, isPending } = useMutation({
    mutationFn: () => organizationsApi.create({ name: name.trim() }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      setCreatedOrg(res.data.data);
    },
    onError: (err) => {
      setError(err.response?.data?.message ?? 'Failed to create organization. Please try again.');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      return setError('Organization name is required.');
    }
    if (name.trim().length < 2) {
      return setError('Name must be at least 2 characters.');
    }
    mutate();
  };

  return (
    <div>
      <PageHeader
        title="New Organization"
        description="Create a new tenant organization for dispatchers to operate in"
      />

      <div className="max-w-md bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        {createdOrg ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-green-50 border border-green-200 p-4">
              <p className="text-sm font-semibold text-green-800 mb-1">Organization created!</p>
              <p className="text-sm text-green-700">
                Name:{' '}
                <span className="font-medium">{createdOrg.name}</span>
              </p>
              <p className="text-sm text-green-700 mt-1">
                Slug:{' '}
                <code className="font-mono font-semibold bg-green-100 px-1 rounded">
                  {createdOrg.slug}
                </code>
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => navigate('/orgs')}>Back to Organizations</Button>
              <Button
                variant="outline"
                onClick={() => {
                  setName('');
                  setCreatedOrg(null);
                  setError('');
                }}
              >
                Create Another
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Organization Name</Label>
              <Input
                id="name"
                placeholder="e.g. Acme Corp"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isPending}
                autoFocus
              />
              <p className="text-xs text-gray-400">
                A URL-friendly slug will be generated automatically.
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Creating…' : 'Create Organization'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/orgs')}
                disabled={isPending}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
