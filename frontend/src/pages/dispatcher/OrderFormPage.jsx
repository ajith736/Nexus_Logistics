import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '@/api/orders.api';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const INITIAL = {
  saleOrderId: '',
  customerName: '',
  customerPhone: '',
  customerAddress: '',
  packageDetails: '',
};

export default function OrderFormPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');

  const mutation = useMutation({
    mutationFn: () => ordersApi.create(form),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      const newId = res.data?.data?._id;
      navigate(newId ? `/orders/${newId}` : '/orders');
    },
    onError: (err) => {
      setServerError(err.response?.data?.message || 'Failed to create order. Please try again.');
    },
  });

  const validate = () => {
    const e = {};
    if (!form.saleOrderId.trim()) e.saleOrderId = 'Sale Order ID is required';
    if (!form.customerName.trim()) e.customerName = 'Customer name is required';
    if (!form.customerPhone.trim()) e.customerPhone = 'Customer phone is required';
    if (!form.customerAddress.trim()) e.customerAddress = 'Delivery address is required';
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
      <PageHeader title="Create Order" description="Manually create a new delivery order" />

      <div className="max-w-lg bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="saleOrderId">Sale Order ID</Label>
            <Input id="saleOrderId" placeholder="e.g. SO-12345" {...field('saleOrderId')} />
            {errors.saleOrderId && <p className="text-xs text-red-600">{errors.saleOrderId}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="customerName">Customer Name</Label>
              <Input id="customerName" placeholder="Full name" {...field('customerName')} />
              {errors.customerName && (
                <p className="text-xs text-red-600">{errors.customerName}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customerPhone">Customer Phone</Label>
              <Input id="customerPhone" placeholder="+1234567890" {...field('customerPhone')} />
              {errors.customerPhone && (
                <p className="text-xs text-red-600">{errors.customerPhone}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="customerAddress">Delivery Address</Label>
            <Input
              id="customerAddress"
              placeholder="Full delivery address"
              {...field('customerAddress')}
            />
            {errors.customerAddress && (
              <p className="text-xs text-red-600">{errors.customerAddress}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="packageDetails">
              Package Details{' '}
              <span className="text-gray-400 font-normal">(optional)</span>
            </Label>
            <Input
              id="packageDetails"
              placeholder="e.g. 2kg electronics, fragile"
              {...field('packageDetails')}
            />
          </div>

          {serverError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {serverError}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Creating…' : 'Create Order'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/orders')}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
