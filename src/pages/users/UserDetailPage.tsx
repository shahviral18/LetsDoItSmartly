import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, ExternalLink, Pencil, X, Save } from 'lucide-react';
import { api } from '../../lib/api';

const planColors: Record<string, string> = {
  basic:      'bg-slate-100 text-slate-600',
  pro:        'bg-blue-50 text-blue-700',
  enterprise: 'bg-indigo-50 text-indigo-700',
  premium:    'bg-cyan-50 text-cyan-700',
};

const statusStyles: Record<string, string> = {
  active:          'bg-green-50 text-green-700',
  suspended:       'bg-red-50 text-red-600',
  pending:         'bg-amber-50 text-amber-700',
  deleted_pending: 'bg-orange-50 text-orange-700',
  deleted:         'bg-slate-100 text-slate-500',
};

interface ApiUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  domain_name: string;
  plan_slug: string;
  status: string;
  last_login_at?: string;
  two_sv_enabled: number;
  storage_used_mb: number;
  storage_total_mb: number;
  ou_path?: string;
  created_at?: string;
  google_created_at?: string;
  created_via_portal?: number;
  deletion_requested_at?: string;
}

function formatDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatShortDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function mbToGb(mb: number) {
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`;
}

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [actionErr, setActionErr] = useState('');

  // Edit profile state
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', new_email: '', recovery_email: '', phone: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [editErr, setEditErr] = useState('');

  // Delete flow state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteStep, setDeleteStep] = useState<'idle' | 'otp-sent' | 'confirming'>('idle');
  const [devOtp, setDevOtp] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [otpSentTo, setOtpSentTo] = useState<string[]>([]);

  function loadUser() {
    if (!id) return;
    api.get<ApiUser>(`/workspace-users/${id}`)
      .then(data => {
        setUser(data);
        setEditForm({ first_name: data.first_name, last_name: data.last_name, new_email: data.email, recovery_email: '', phone: '' });
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load user'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadUser(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    setEditSaving(true); setEditErr('');
    try {
      const payload: Record<string, string> = {
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        recovery_email: editForm.recovery_email,
        phone: editForm.phone,
      };
      if (editForm.new_email !== user?.email) payload.new_email = editForm.new_email;
      await api.patch(`/workspace-users/${id}`, payload);
      setEditing(false);
      setLoading(true);
      loadUser();
    } catch (err) {
      setEditErr(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setEditSaving(false);
    }
  }

  async function doAction(action: string, extra?: Record<string, unknown>) {
    setActionMsg('');
    setActionErr('');
    try {
      const res = await api.patch<{ message: string; temp_password?: string }>(`/workspace-users/${id}/action`, { action, ...extra });
      setActionMsg(res.message);
      if (res.temp_password) {
        alert(`New temporary password: ${res.temp_password}\n\nShare this with the user securely.`);
      }
      setLoading(true);
      loadUser();
    } catch (err: unknown) {
      setActionErr(err instanceof Error ? err.message : 'Action failed');
    }
  }

  async function requestDelete() {
    setActionErr('');
    try {
      const res = await api.patch<{ message: string; otp_sent_to: string[]; _dev_otp?: string }>(`/workspace-users/${id}/action`, { action: 'archive' });
      setOtpSentTo(res.otp_sent_to ?? []);
      setDevOtp(res._dev_otp ?? '');
      setDeleteStep('otp-sent');
    } catch (err: unknown) {
      setActionErr(err instanceof Error ? err.message : 'Failed to send OTP');
    }
  }

  async function confirmDelete() {
    if (!otpInput.trim()) return;
    setDeleteStep('confirming');
    try {
      const res = await api.patch<{ message: string }>(`/workspace-users/${id}/action`, { action: 'archive-confirm', otp: otpInput.trim() });
      setActionMsg(res.message);
      setShowDeleteConfirm(false);
      setDeleteStep('idle');
      setLoading(true);
      loadUser();
    } catch (err: unknown) {
      setActionErr(err instanceof Error ? err.message : 'Invalid OTP or confirmation failed');
      setDeleteStep('otp-sent');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-[#1A7DC4]" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500">{error || 'User not found.'}</p>
        <Link to="/users" className="text-[#1A7DC4] text-sm mt-2 inline-block">← Back to Users</Link>
      </div>
    );
  }

  const initials = `${user.first_name[0] ?? ''}${user.last_name[0] ?? ''}`.toUpperCase();
  const isDeletedPending = user.status === 'deleted_pending';

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <Link to="/users" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#1A7DC4] transition-colors mb-4">
          <ArrowLeft size={14} /> Back to Users
        </Link>
        <div className="flex items-start gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold shrink-0"
            style={{ background: 'linear-gradient(135deg,#1A7DC4,#29ABE2)' }}
          >
            {initials}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-semibold text-slate-800">{user.first_name} {user.last_name}</h1>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusStyles[user.status] ?? ''}`}>
                {user.status.replace('_', ' ')}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${planColors[user.plan_slug] ?? ''}`}>
                {user.plan_slug}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">{user.email} · {user.domain_name}</p>
          </div>
        </div>
      </div>

      {actionMsg && (
        <div className="px-4 py-2.5 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">{actionMsg}</div>
      )}
      {actionErr && (
        <div className="px-4 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{actionErr}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Profile card */}
        <div className="lg:col-span-1 space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">Profile</h2>
              {!editing ? (
                <button
                  onClick={() => { setEditing(true); setEditErr(''); }}
                  className="flex items-center gap-1 text-xs text-[#1A7DC4] hover:text-blue-700 transition-colors"
                >
                  <Pencil size={12} /> Edit
                </button>
              ) : (
                <button
                  onClick={() => setEditing(false)}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
                >
                  <X size={12} /> Cancel
                </button>
              )}
            </div>

            {editing ? (
              <form onSubmit={saveEdit} className="space-y-3">
                <EditField label="First Name" value={editForm.first_name} onChange={v => setEditForm(f => ({ ...f, first_name: v }))} required />
                <EditField label="Last Name" value={editForm.last_name} onChange={v => setEditForm(f => ({ ...f, last_name: v }))} required />
                <EditField label="Email / Username" value={editForm.new_email} onChange={v => setEditForm(f => ({ ...f, new_email: v }))} type="email" required />
                <EditField label="Recovery Email" value={editForm.recovery_email} onChange={v => setEditForm(f => ({ ...f, recovery_email: v }))} type="email" placeholder="Optional" />
                <EditField label="Phone" value={editForm.phone} onChange={v => setEditForm(f => ({ ...f, phone: v }))} type="tel" placeholder="Optional" />
                {editErr && <p className="text-xs text-red-600">{editErr}</p>}
                <button
                  type="submit"
                  disabled={editSaving}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#1A7DC4] text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
                >
                  {editSaving ? <><Loader2 size={13} className="animate-spin" /> Saving…</> : <><Save size={13} /> Save Changes</>}
                </button>
              </form>
            ) : (
              <>
                <InfoRow label="Email" value={user.email} />
                <InfoRow label="Domain" value={user.domain_name} />
                <InfoRow label="Plan" value={user.plan_slug.charAt(0).toUpperCase() + user.plan_slug.slice(1)} />
                <InfoRow label="OU Path" value={user.ou_path ?? '—'} />
                <InfoRow label="Account Source" value={user.created_via_portal ? 'Via Portal' : 'Synced from Google'} valueColor={user.created_via_portal ? 'text-blue-600' : 'text-slate-500'} />
                <InfoRow label="Google Created" value={formatShortDate(user.google_created_at)} />
                <InfoRow label="Last Login" value={user.last_login_at ? formatDate(user.last_login_at) : 'Never'} valueColor={!user.last_login_at ? 'text-red-500' : undefined} />
                <InfoRow label="2SV" value={user.two_sv_enabled ? 'Enabled ✓' : 'Disabled ✗'} valueColor={user.two_sv_enabled ? 'text-green-600' : 'text-red-500'} />
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Storage</span>
                    <span className="font-medium text-slate-700">{mbToGb(user.storage_used_mb)} / {mbToGb(user.storage_total_mb)}</span>
                  </div>
                  {user.storage_total_mb > 0 && (() => {
                    const pct = Math.min(100, Math.round(user.storage_used_mb / user.storage_total_mb * 100));
                    const color = pct >= 90 ? '#EF4444' : pct >= 75 ? '#F59E0B' : '#1A7DC4';
                    return (
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    );
                  })()}
                </div>
                {isDeletedPending && user.deletion_requested_at && (
                  <InfoRow
                    label="Deletion date"
                    value={formatShortDate(new Date(new Date(user.deletion_requested_at).getTime() + 30 * 86400000).toISOString())}
                    valueColor="text-orange-600"
                  />
                )}
              </>
            )}
          </div>

          {/* Actions */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-2">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Actions</h2>
            {user.status === 'active' && (
              <ActionButton label="Suspend User" color="red" onClick={() => doAction('suspend')} />
            )}
            {user.status === 'suspended' && (
              <ActionButton label="Activate User" color="green" onClick={() => doAction('unsuspend')} />
            )}
            {isDeletedPending && (
              <ActionButton label="Recover User" color="green" onClick={() => doAction('restore')} />
            )}
            {user.status === 'active' && (
              <ActionButton label="Reset Password" color="amber" onClick={() => doAction('reset-password')} />
            )}
            {!isDeletedPending && user.status !== 'deleted' && (
              <ActionButton label="Delete User…" color="red" onClick={() => { setShowDeleteConfirm(true); setDeleteStep('idle'); setActionErr(''); setOtpInput(''); }} />
            )}
          </div>
        </div>

        {/* Right: Info */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Account Details</h2>
            <p className="text-sm text-slate-500">
              {isDeletedPending
                ? 'This account is pending permanent deletion. It is suspended in Google Workspace. You can recover it within 30 days.'
                : 'Manage this user\'s Google Workspace session and login activity using the quick links below.'}
            </p>
            {!isDeletedPending && (
              <div className="mt-4 flex flex-col gap-2">
                <button
                  onClick={() => navigate(`/security/google-logins?email=${encodeURIComponent(user.email)}`)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-[#1A7DC4] hover:bg-blue-50 hover:border-[#1A7DC4] transition-colors text-left"
                >
                  <ExternalLink size={14} />
                  View Google Login History
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-semibold text-slate-800">Delete User</h3>
            {deleteStep === 'idle' && (
              <>
                <p className="text-sm text-slate-600">
                  This will suspend <strong>{user.email}</strong> in Google Workspace and free the license immediately.
                  The account can be recovered within 30 days.
                </p>
                <p className="text-sm text-slate-600">
                  An OTP will be sent to the billing entity contact for confirmation.
                </p>
                {actionErr && <p className="text-sm text-red-600">{actionErr}</p>}
                <div className="flex gap-3">
                  <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                  <button onClick={requestDelete} className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600">Send OTP</button>
                </div>
              </>
            )}
            {(deleteStep === 'otp-sent' || deleteStep === 'confirming') && (
              <>
                <p className="text-sm text-slate-600">OTP sent to: <strong>{otpSentTo.join(', ')}</strong></p>
                {devOtp && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                    Dev mode — OTP: <strong>{devOtp}</strong>
                  </p>
                )}
                <input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otpInput}
                  onChange={e => setOtpInput(e.target.value)}
                  maxLength={6}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 tracking-widest text-center font-mono"
                />
                {actionErr && <p className="text-sm text-red-600">{actionErr}</p>}
                <div className="flex gap-3">
                  <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                  <button
                    onClick={confirmDelete}
                    disabled={deleteStep === 'confirming' || otpInput.length < 6}
                    className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {deleteStep === 'confirming' ? <><Loader2 size={14} className="animate-spin" /> Confirming…</> : 'Confirm Delete'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, valueColor = 'text-slate-800' }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex justify-between items-start gap-3">
      <span className="text-xs text-slate-500 shrink-0">{label}</span>
      <span className={`text-sm font-medium text-right break-all ${valueColor}`}>{value}</span>
    </div>
  );
}

function EditField({ label, value, onChange, type = 'text', required, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; placeholder?: string;
}) {
  return (
    <div className="space-y-0.5">
      <label className="text-xs text-slate-500">{label}{required && ' *'}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-[#1A7DC4] focus:ring-2 focus:ring-blue-100 text-slate-800"
      />
    </div>
  );
}

function ActionButton({ label, color, onClick }: { label: string; color: 'red' | 'green' | 'amber'; onClick: () => void }) {
  const cls = {
    red:   'text-red-600 bg-red-50 hover:bg-red-100 border-red-200',
    green: 'text-green-700 bg-green-50 hover:bg-green-100 border-green-200',
    amber: 'text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200',
  }[color];
  return (
    <button onClick={onClick} className={`w-full px-3 py-2 rounded-lg border text-sm font-medium transition-colors text-left ${cls}`}>
      {label}
    </button>
  );
}

export default UserDetailPage;
