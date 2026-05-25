import { useState, useEffect } from "react";
import { Loader2, UserCircle, Save, Key, Globe, CheckCircle2, AlertCircle } from "lucide-react";
import { api } from "../../lib/api";

interface ProfileData {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company_name?: string;
  gstin?: string;
  billing_address?: string;
  role: string;
  domains?: { id: number; name: string }[];
}

function Field({ label, value, onChange, type = "text", required }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        className="w-full h-10 px-3 rounded-lg bg-surface-2 border border-border/50 focus:border-primary/50 focus:outline-none text-sm text-foreground"
      />
    </div>
  );
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [saveErr, setSaveErr] = useState('');

  // Editable fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [gstin, setGstin] = useState('');
  const [billingAddress, setBillingAddress] = useState('');

  // Password change
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState('');
  const [pwErr, setPwErr] = useState('');

  useEffect(() => {
    api.get<ProfileData>('/profile')
      .then(data => {
        setProfile(data);
        setFirstName(data.first_name ?? '');
        setLastName(data.last_name ?? '');
        setPhone(data.phone ?? '');
        setCompanyName(data.company_name ?? '');
        setGstin(data.gstin ?? '');
        setBillingAddress(data.billing_address ?? '');
      })
      .catch(e => setLoadErr(e instanceof Error ? e.message : 'Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setSaveMsg(''); setSaveErr('');
    try {
      await api.patch('/profile', { first_name: firstName, last_name: lastName, phone, company_name: companyName, gstin, billing_address: billingAddress });
      setSaveMsg('Profile updated successfully.');
      setTimeout(() => setSaveMsg(''), 4000);
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPw !== confirmPw) { setPwErr('New passwords do not match.'); return; }
    if (newPw.length < 8) { setPwErr('Password must be at least 8 characters.'); return; }
    setPwSaving(true); setPwMsg(''); setPwErr('');
    try {
      await api.patch('/profile/password', { current_password: currentPw, new_password: newPw });
      setPwMsg('Password changed successfully.');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setTimeout(() => setPwMsg(''), 4000);
    } catch (err) {
      setPwErr(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setPwSaving(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }
  if (loadErr) {
    return <div className="p-6 flex items-center gap-2 text-danger text-sm"><AlertCircle className="w-4 h-4 shrink-0" />{loadErr}</div>;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <UserCircle className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold text-foreground">My Profile</h1>
          <p className="text-sm text-muted-foreground">{profile?.email} · <span className="capitalize">{profile?.role?.replace('_', ' ')}</span></p>
        </div>
      </div>

      {/* Profile details */}
      <div className="bg-card rounded-xl border border-border shadow-card p-6">
        <h2 className="text-sm font-bold text-foreground mb-5">Account Details</h2>
        <form onSubmit={saveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="First Name" value={firstName} onChange={setFirstName} required />
            <Field label="Last Name" value={lastName} onChange={setLastName} required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Phone Number" value={phone} onChange={setPhone} type="tel" />
            <Field label="Company Name" value={companyName} onChange={setCompanyName} />
          </div>
          <Field label="GSTIN" value={gstin} onChange={setGstin} />
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Billing Address</label>
            <textarea
              value={billingAddress}
              onChange={e => setBillingAddress(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border/50 focus:border-primary/50 focus:outline-none text-sm text-foreground resize-none"
            />
          </div>
          {saveMsg && (
            <div className="flex items-center gap-2 text-success text-sm"><CheckCircle2 className="w-4 h-4" />{saveMsg}</div>
          )}
          {saveErr && (
            <div className="flex items-center gap-2 text-danger text-sm"><AlertCircle className="w-4 h-4" />{saveErr}</div>
          )}
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-semibold glow-primary transition-all disabled:opacity-50">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save Changes</>}
          </button>
        </form>
      </div>

      {/* Change password */}
      <div className="bg-card rounded-xl border border-border shadow-card p-6">
        <h2 className="text-sm font-bold text-foreground mb-5 flex items-center gap-2"><Key className="w-4 h-4 text-primary" /> Change Password</h2>
        <form onSubmit={changePassword} className="space-y-4">
          <Field label="Current Password" value={currentPw} onChange={setCurrentPw} type="password" required />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="New Password" value={newPw} onChange={setNewPw} type="password" required />
            <Field label="Confirm New Password" value={confirmPw} onChange={setConfirmPw} type="password" required />
          </div>
          {pwMsg && <div className="flex items-center gap-2 text-success text-sm"><CheckCircle2 className="w-4 h-4" />{pwMsg}</div>}
          {pwErr && <div className="flex items-center gap-2 text-danger text-sm"><AlertCircle className="w-4 h-4" />{pwErr}</div>}
          <button type="submit" disabled={pwSaving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-semibold glow-primary transition-all disabled:opacity-50">
            {pwSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating…</> : <><Key className="w-4 h-4" /> Update Password</>}
          </button>
        </form>
      </div>

      {/* Linked domains — only relevant for domain_owner accounts */}
      {profile?.role === 'domain_owner' && (
        <div className="bg-card rounded-xl border border-border shadow-card p-6">
          <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2"><Globe className="w-4 h-4 text-primary" /> Linked Domains</h2>
          {profile.domains && profile.domains.length > 0 ? (
            <div className="space-y-2">
              {profile.domains.map(d => (
                <div key={d.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-2 border border-border/40">
                  <Globe className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-sm font-medium text-foreground">{d.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No domains linked to your account.</p>
          )}
        </div>
      )}
    </div>
  );
}
