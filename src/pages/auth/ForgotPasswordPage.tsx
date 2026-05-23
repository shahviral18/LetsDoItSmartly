import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Loader2, Mail } from 'lucide-react';
import { AuthCard } from '../../components/auth/AuthCard';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setLoading(false);
    setSent(true);
  }

  if (sent) {
    return (
      <AuthCard title="Check your inbox" subtitle={`We sent a reset link to ${email}`}>
        <div className="flex flex-col items-center gap-4 py-2">
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: '#F0F7FF' }}>
            <CheckCircle2 size={28} style={{ color: '#1A7DC4' }} />
          </div>
          <p className="text-sm text-slate-500 text-center">
            Follow the link in the email to reset your password. It expires in 30 minutes.
          </p>
          <p className="text-xs text-slate-400 text-center">
            Didn't receive it? Check your spam folder or{' '}
            <button
              onClick={() => setSent(false)}
              className="underline hover:no-underline"
              style={{ color: '#1A7DC4' }}
            >
              try again
            </button>
            .
          </p>
        </div>
        <div className="mt-6 border-t border-slate-100 pt-4">
          <Link
            to="/login"
            className="flex items-center justify-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft size={14} /> Back to sign in
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Forgot your password?"
      subtitle="Enter your email and we'll send you a reset link."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Email address
          </label>
          <div className="relative">
            <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-70"
          style={{ background: 'linear-gradient(135deg,#1A7DC4,#29ABE2)' }}
        >
          {loading && <Loader2 size={15} className="animate-spin" />}
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>

      <div className="mt-6 border-t border-slate-100 pt-4">
        <Link
          to="/login"
          className="flex items-center justify-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft size={14} /> Back to sign in
        </Link>
      </div>
    </AuthCard>
  );
}

export default ForgotPasswordPage;
