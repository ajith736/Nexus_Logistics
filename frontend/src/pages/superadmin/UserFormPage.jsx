import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/api/users.api';
import { organizationsApi } from '@/api/organizations.api';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function UserFormPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    orgId: '',
  });
  const [error, setError] = useState('');

  const { data: orgsData, isLoading: orgsLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => organizationsApi.list().then((r) => r.data),
  });
  const orgs = orgsData?.data ?? [];

  const { mutate, isPending } = useMutation({
    mutationFn: () => usersApi.create(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      navigate('/users');
    },
    onError: (err) => {
      setError(err.response?.data?.message ?? 'Failed to create user. Please try again.');
    },
  });

  const setField = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const { name, email, password, orgId } = form;
    if (!name.trim()) return setError('Full name is required.');
    if (!email.trim()) return setError('Email address is required.');
    if (!password.trim()) return setError('Password is required.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (!orgId) return setError('Please select an organization.');

    mutate();
  };

  return (
    <div>
      <PageHeader
        title="New User"
        description="Create a dispatcher account and assign it to an organization"
      />

      <div className="max-w-md bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              placeholder="e.g. Jane Doe"
              value={form.name}
              onChange={setField('name')}
              disabled={isPending}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="jane@example.com"
              value={form.email}
              onChange={setField('email')}
              disabled={isPending}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Min 8 characters"
              value={form.password}
              onChange={setField('password')}
              disabled={isPending}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Organization</Label>
            <Select
              value={form.orgId}
              onValueChange={(v) => setForm((prev) => ({ ...prev, orgId: v }))}
              disabled={isPending || orgsLoading}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={orgsLoading ? 'Loading organizations…' : 'Select an organization'}
                />
              </SelectTrigger>
              <SelectContent>
                {orgs.length === 0 ? (
                  <SelectItem value="__none__" disabled>
                    No organizations available
                  </SelectItem>
                ) : (
                  orgs.map((org) => (
                    <SelectItem key={org._id} value={org._id}>
                      {org.name}
                      <span className="ml-1.5 text-gray-400 text-xs font-mono">
                        ({org.slug})
                      </span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Creating…' : 'Create User'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/users')}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
