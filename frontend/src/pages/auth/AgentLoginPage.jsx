import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Truck, Delete } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { authApi } from '@/api/auth.api';
import { cn } from '@/lib/utils';

const KEYPAD = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

export default function AgentLoginPage() {
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleKey = (k) => {
    if (k === '⌫') {
      setPin((p) => p.slice(0, -1));
    } else if (pin.length < 6) {
      setPin((p) => p + k);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.agentLogin(phone, pin);
      const { accessToken, agent } = res.data.data;
      // backend returns `agent` field; normalise to `user` with role injected
      login({ accessToken, refreshToken: null, user: { ...agent, role: 'agent' } });
      navigate('/my-orders');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <Card className="w-full max-w-xs shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-3">
            <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center">
              <Truck className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle>Agent Login</CardTitle>
          <CardDescription>Enter your phone &amp; PIN</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+91 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>PIN</Label>
              <div className="flex gap-2 justify-center">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'h-10 w-10 rounded-lg border-2 flex items-center justify-center text-lg font-bold transition-colors',
                      i < pin.length
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-300 bg-white text-transparent'
                    )}
                  >
                    {i < pin.length ? '•' : '·'}
                  </div>
                ))}
              </div>
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-2">
              {KEYPAD.map((k, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => k && handleKey(k)}
                  className={cn(
                    'h-12 rounded-lg text-lg font-medium transition-colors',
                    k === ''
                      ? 'cursor-default'
                      : k === '⌫'
                      ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center'
                      : 'bg-gray-100 hover:bg-blue-50 hover:text-blue-700 text-gray-800'
                  )}
                  disabled={!k}
                >
                  {k === '⌫' ? <Delete className="h-4 w-4 mx-auto" /> : k}
                </button>
              ))}
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2 text-center">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading || pin.length < 4}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-gray-500">
            Dispatcher?{' '}
            <Link to="/login" className="text-blue-600 hover:underline font-medium">
              Staff login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
