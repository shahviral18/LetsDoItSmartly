import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AuthCard } from '../../components/auth/AuthCard';
import { getRoleDashboard } from '../../router/roleRoutes';

function strengthLabel(score: number): { label: string; color: string } {
  if (score < 2) return { label: 'Weak', color: '#EF4444' };
  if (score < 3) return { label: 'Fair', color: '#F59E0B' };
  if (score < 4) return { label: 'Good', color: '#10B981' };
  return { label: 'Strong', color: '#1A7DC4' };
}

function calcStrength(pw: string): number {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

export function ForceResetPage() {
  const { auth, completeForceReset } = useAuth();
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const forceResetUser = auth.status === 'force_reset' ? auth.user : null;
  if (!forceResetUser) { navigate('/login'); return null; }
  const strength = calcStrength(newPassword);
  const { label: strengthText, color: strengthColor } = strengthLabel(strength);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!forceResetUser) { navigate('/login'); return; }
    setError('');
    if (newPassword !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (strength < 3) {
      setError('Please choose a stronger password.');
      return;
    }
    setLoading(true);
    await new Promise(r => setTimeout(r, 900));
    setLoading(false);
    completeForceReset();
    navigate(getRoleDashboard(forceResetUser.role));
  }

  return (
    <AuthCard title="Set a new password" subtitle="Your password must be changed before continuing.">
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-3 mb-5">
        <ShieldAlert size={16} className="text-amber-500 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-700">
          For security, you are required to set a new password before accessing your account.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">New password</label>
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              required
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
            <button
              type="button"
              onClick={() => setShowNew(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {newPassword && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex gap-1 flex-1">
                {[1, 2, 3, 4].map(i => (
                  <div
                    key={i}
                    className="h-1 flex-1 rounded-full transition-all"
                    style={{ background: strength >= i ? strengthColor : '#E2E8F0' }}
                  />
                ))}
              </div>
              <span className="text-xs font-medium" style={{ color: strengthColor }}>
                {strengthText}
              </span>
            </div>
          )}
          <p className="text-xs text-slate-400 mt-1.5">
            Min 8 characters, uppercase, number, and special character.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm password</label>
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              required
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {confirm && newPassword && confirm !== newPassword && (
            <p className="text-xs text-red-500 mt-1">Passwords do not match.</p>
          )}
        </div>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-70"
          style={{ background: 'linear-gradient(135deg,#1A7DC4,#29ABE2)' }}
        >
          {loading && <Loader2 size={15} className="animate-spin" />}
          {loading ? 'Updating password…' : 'Set new password & continue'}
        </button>
      </form>
    </AuthCard>
  );
}
