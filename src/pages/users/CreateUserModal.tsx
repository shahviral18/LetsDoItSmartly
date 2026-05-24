import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import type { PortalUser, Plan } from '../../types';

interface CreateUserModalProps {
  onClose: () => void;
  onCreate: (user: PortalUser) => void;
  existingUsers: PortalUser[];
}

interface ApiDomain {
  id: number;
  name: string;
  billing_entity_id: number;
}

export function CreateUserModal({ onClose, onCreate, existingUsers }: CreateUserModalProps) {
  const { user: authUser } = useAuth();
  const [domains, setDomains] = useState<ApiDomain[]>([]);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    domainId: '',
    plan: 'basic' as Plan,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    const endpoint = authUser?.role === 'domain_owner' ? '/my/domains' : '/domains';
    api.get<{ data: ApiDomain[] }>(endpoint).then(res => {
      setDomains(res.data);
      if (res.data.length) setForm(f => ({ ...f, domainId: String(res.data[0].id) }));
    }).catch(() => {});
  }, []);

  function validate() {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = 'Required';
    if (!form.lastName.trim()) e.lastName = 'Required';
    if (!form.email.trim()) e.email = 'Required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email';
    else if (existingUsers.some(u => u.email === form.email)) e.email = 'Email already in use';
    if (!form.domainId) e.domainId = 'Required';
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSubmitting(true);
    setApiError('');
    try {
      const res = await api.post<{ id: number; email: string; temp_password: string }>('/workspace-users', {
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        email: form.email.trim(),
        domain_id: Number(form.domainId),
        plan_slug: form.plan,
      });
      const domain = domains.find(d => d.id === Number(form.domainId));
      const newUser: PortalUser = {
        id: String(res.id),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: res.email,
        domain: domain?.name ?? '',
        plan: form.plan,
        status: 'active',
        lastLogin: undefined,
        twoSVEnabled: false,
        storageUsed: '0 GB',
        storageTotal: '15 GB',
        createdAt: new Date().toISOString().slice(0, 10),
      };
      if (res.temp_password) {
        alert(`User created!\n\nTemporary password: ${res.temp_password}\n\nShare this with the user securely.`);
      }
      onCreate(newUser);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  }

  const field = (name: keyof typeof form) => ({
    value: form[name] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [name]: e.target.value })),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div
          className="px-6 py-5 text-white flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg,#1A7DC4,#29ABE2)' }}
        >
          <div>
            <h2 className="text-lg font-semibold">Create New User</h2>
            <p className="text-sm text-blue-100 mt-0.5">Fill in the details to provision a new account</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {apiError && (
            <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{apiError}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormField label="First Name" error={errors.firstName}>
              <input {...field('firstName')} placeholder="Rohan" className={inputCls(errors.firstName)} />
            </FormField>
            <FormField label="Last Name" error={errors.lastName}>
              <input {...field('lastName')} placeholder="Shah" className={inputCls(errors.lastName)} />
            </FormField>
          </div>

          <FormField label="Email Address" error={errors.email}>
            <input {...field('email')} type="email" placeholder="rohan@abc.com" className={inputCls(errors.email)} />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Domain" error={errors.domainId}>
              <select {...field('domainId')} className={inputCls(errors.domainId)}>
                {domains.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Plan">
              <select {...field('plan')} className={inputCls()}>
                {(['basic', 'pro', 'enterprise', 'premium'] as Plan[]).map(p => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </FormField>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg,#1A7DC4,#29ABE2)' }}
            >
              {submitting ? <><Loader2 size={14} className="animate-spin" /> Creating…</> : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function inputCls(error?: string) {
  return `w-full px-3 py-2.5 rounded-lg border text-sm text-slate-800 outline-none transition-colors ${
    error
      ? 'border-red-300 focus:ring-2 focus:ring-red-200'
      : 'border-slate-200 focus:border-[#1A7DC4] focus:ring-2 focus:ring-[#1A7DC4]/20'
  }`;
}

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1.5">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
