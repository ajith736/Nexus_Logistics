import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { agentsApi } from '@/api/agents.api';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AgentFormPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({ name: '', phone: '', pin: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');

  const mutation = useMutation({
    mutationFn: () => agentsApi.create(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      navigate('/agents');
    },
    onError: (err) => {
      setServerError(err.response?.data?.message || 'Failed to create agent. Please try again.');
    },
  });

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.phone.trim()) e.phone = 'Phone is required';
    if (!form.pin.trim()) e.pin = 'PIN is required';
    else if (form.pin.length < 4) e.pin = 'PIN must be at least 4 digits';
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setServerError('');
    const e_ = validate();
    if (Object.keys(e_).length) {
      setErrors(e_);
      return;
    }
    setErrors({});
    mutation.mutate();
  };

  const field = (key) => ({
    value: form[key],
    onChange: (e) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
      setErrors((errs) => ({ ...errs, [key]: undefined }));
    },
  });

  return (
    <div>
      <PageHeader title="New Agent" description="Create a new delivery agent account" />

      <div className="max-w-md bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" placeholder="e.g. John Smith" {...field('name')} />
            {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone Number</Label>
            <Input id="phone" placeholder="e.g. +1234567890" {...field('phone')} />
            {errors.phone && <p className="text-xs text-red-600">{errors.phone}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pin">Login PIN</Label>
            <Input
              id="pin"
              type="password"
              placeholder="4–6 digit PIN"
              maxLength={6}
              {...field('pin')}
            />
            {errors.pin && <p className="text-xs text-red-600">{errors.pin}</p>}
            <p className="text-xs text-gray-400">The agent uses this PIN to log in on their device.</p>
          </div>

          {serverError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {serverError}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Creating…' : 'Create Agent'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/agents')}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
