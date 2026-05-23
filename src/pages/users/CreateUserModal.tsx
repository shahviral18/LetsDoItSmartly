import { useState } from 'react';
import { X } from 'lucide-react';
import { mockBillingEntities } from '../../mock/data';
import type { PortalUser, Plan } from '../../types';

interface CreateUserModalProps {
  onClose: () => void;
  onCreate: (user: PortalUser) => void;
  existingUsers: PortalUser[];
}

const allDomains = mockBillingEntities.flatMap(be => be.domains);

export function CreateUserModal({ onClose, onCreate, existingUsers }: CreateUserModalProps) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    domain: allDomains[0]?.name ?? '',
    plan: 'basic' as Plan,
    password: '',
    sendWelcome: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = 'Required';
    if (!form.lastName.trim()) e.lastName = 'Required';
    if (!form.email.trim()) e.email = 'Required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email';
    else if (existingUsers.some(u => u.email === form.email)) e.email = 'Email already in use';
    if (!form.password || form.password.length < 8) e.password = 'Minimum 8 characters';
    return e;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const newUser: PortalUser = {
      id: `u${Date.now()}`,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      domain: form.domain,
      plan: form.plan,
      status: 'pending',
      lastLogin: undefined,
      twoSVEnabled: false,
      storageUsed: '0 GB',
      storageTotal: form.plan === 'basic' ? '15 GB' : form.plan === 'pro' ? '30 GB' : '50 GB',
      createdAt: new Date().toISOString().slice(0, 10),
    };
    onCreate(newUser);
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
        {/* Header */}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
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
            <FormField label="Domain">
              <select {...field('domain')} className={inputCls()}>
                {allDomains.map(d => (
                  <option key={d.id} value={d.name}>{d.name}</option>
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

          <FormField label="Temporary Password" error={errors.password}>
            <input {...field('password')} type="password" placeholder="Min. 8 characters" className={inputCls(errors.password)} />
          </FormField>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={form.sendWelcome}
              onChange={e => setForm(prev => ({ ...prev, sendWelcome: e.target.checked }))}
              className="w-4 h-4 rounded accent-[#1A7DC4]"
            />
            <span className="text-sm text-slate-700">Send welcome email to user</span>
          </label>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(135deg,#1A7DC4,#29ABE2)' }}
            >
              Create User
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
