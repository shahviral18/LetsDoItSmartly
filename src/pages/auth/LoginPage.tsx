import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AuthCard } from '../../components/auth/AuthCard';
import { getRoleDashboard } from '../../router/roleRoutes';
import { mockAuthUsers } from '../../mock/data';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result === 'invalid') {
      setError('Invalid email or password.');
      return;
    }
    if (result === 'force_reset') {
      navigate('/force-reset');
      return;
    }
    const user = Object.values(mockAuthUsers).find(u => u.email === email)!;
    navigate(getRoleDashboard(user.role));
  }

  return (
    <AuthCard title="Welcome back" subtitle="Sign in to your account to continue">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Email address
          </label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-slate-700">Password</label>
            <Link
              to="/forgot-password"
              className="text-xs font-medium hover:underline"
              style={{ color: '#1A7DC4' }}
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70"
          style={{ background: loading ? '#1A7DC4aa' : 'linear-gradient(135deg,#1A7DC4,#29ABE2)' }}
        >
          {loading && <Loader2 size={15} className="animate-spin" />}
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      {/* Dev hint */}
      <details className="mt-6">
        <summary className="text-xs text-slate-400 cursor-pointer select-none">
          Dev: quick login hints
        </summary>
        <div className="mt-2 text-xs text-slate-500 space-y-0.5 bg-slate-50 rounded-lg p-3">
          {Object.values(mockAuthUsers).map(u => (
            <div key={u.id} className="flex gap-2">
              <span className="font-medium w-32 truncate">{u.email}</span>
              <span className="text-slate-400">any password</span>
              <span className="ml-auto text-blue-400">{u.role}</span>
            </div>
          ))}
          <div className="border-t border-slate-200 mt-2 pt-2 text-slate-400">
            Password <code>reset123</code> → force reset flow
          </div>
        </div>
      </details>
    </AuthCard>
  );
}
