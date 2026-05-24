import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, Plus, CheckCircle2, Clock, Loader2, AlertCircle, XCircle, ChevronRight, Mail, Users, Globe } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useDomain } from "../../context/DomainContext";
import { api } from "../../lib/api";
import type { BccDirection, BccStatus } from "../../types";
import { cn } from "../../lib/utils";
import { useNavigate } from "react-router-dom";

interface BccRequest {
  id: string;
  domain: string;
  ou_path: string;
  billing_entity_id: string;
  affected_users: string | string[];
  surveillance_email: string;
  directions: BccDirection[];
  status: BccStatus;
  requested_by: string;
  requested_at: string;
  completed_at?: string;
  notes?: string;
}

interface WorkspaceUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
}

const directionLabels: Record<BccDirection, { label: string; desc: string }> = {
  outbound:           { label: "Outbound",           desc: "Emails sent to external recipients" },
  inbound:            { label: "Inbound",             desc: "Emails received from external senders" },
  internal_sending:   { label: "Internal Sending",    desc: "Emails sent within the organisation" },
  internal_receiving: { label: "Internal Receiving",  desc: "Emails received within the organisation" },
};

const statusConfig: Record<BccStatus, { label: string; icon: any; color: string }> = {
  pending:     { label: "Pending",     icon: Clock,        color: "bg-warning/10 text-warning border-warning/20" },
  in_progress: { label: "In Progress", icon: Loader2,      color: "bg-primary/10 text-primary border-primary/20" },
  completed:   { label: "Completed",   icon: CheckCircle2, color: "bg-success/10 text-success border-success/20" },
  rejected:    { label: "Rejected",    icon: XCircle,      color: "bg-danger/10 text-danger border-danger/20" },
};

function StatusBadge({ status }: { status: BccStatus }) {
  const cfg = statusConfig[status];
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded border", cfg.color)}>
      <cfg.icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

export default function EmailSurveillancePage() {
  const { user } = useAuth();
  const { domains } = useDomain();
  const navigate = useNavigate();
  const isDomainOwner = user?.role === "domain_owner";
  const isStaff = ["super_admin","admin","support_admin","account_manager"].includes(user?.role ?? "");

  const [requests, setRequests] = useState<BccRequest[]>([]);
  const [reqLoading, setReqLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [domain, setDomain] = useState("");
  const [domainUsers, setDomainUsers] = useState<WorkspaceUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [affectedType, setAffectedType] = useState<"all" | "specific">("all");
  const [specificUsers, setSpecificUsers] = useState<string[]>([]);
  const [surveillanceEmail, setSurveillanceEmail] = useState("");
  const [directions, setDirections] = useState<BccDirection[]>(["outbound"]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitErr, setSubmitErr] = useState('');

  function loadRequests() {
    setReqLoading(true);
    api.get<{ data: BccRequest[] }>('/bcc-requests')
      .then(r => setRequests(r.data ?? []))
      .catch(() => {})
      .finally(() => setReqLoading(false));
  }

  useEffect(() => { loadRequests(); }, []);

  // Set default domain when domains load
  useEffect(() => {
    if (domains.length > 0 && !domain) setDomain(domains[0].name);
  }, [domains]);

  // Load users when domain changes
  useEffect(() => {
    if (!domain) return;
    const d = domains.find(x => x.name === domain);
    if (!d) return;
    setUsersLoading(true);
    setDomainUsers([]);
    api.get<{ data: WorkspaceUser[] }>(`/workspace-users?domain_id=${d.id}`)
      .then(r => setDomainUsers(r.data ?? []))
      .catch(() => {})
      .finally(() => setUsersLoading(false));
  }, [domain]);

  const toggleDirection = (d: BccDirection) =>
    setDirections(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  const toggleUser = (email: string) =>
    setSpecificUsers(prev => prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!surveillanceEmail || directions.length === 0) return;
    setSubmitting(true);
    setSubmitErr('');
    try {
      const selectedDomain = domains.find(d => d.name === domain);
      await api.post('/bcc-requests', {
        domain,
        billing_entity_id: selectedDomain?.billing_entity_id ?? '',
        affected_users: affectedType === "all" ? "all" : specificUsers,
        surveillance_email: surveillanceEmail,
        directions,
      });
      setSubmitted(true);
      setShowForm(false);
      setSurveillanceEmail("");
      setDirections(["outbound"]);
      setSpecificUsers([]);
      setAffectedType("all");
      loadRequests();
      setTimeout(() => setSubmitted(false), 4000);
    } catch (err) {
      setSubmitErr(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><Eye className="w-5 h-5 text-primary" /> Email Surveillance</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Configure BCC monitoring for outbound and inbound emails.</p>
        </div>
        {(isDomainOwner || isStaff) && !showForm && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-semibold glow-primary transition-all">
            <Plus className="w-4 h-4" /> New Request
          </button>
        )}
      </div>

      <AnimatePresence>
        {submitted && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-success/10 border border-success/20 text-success text-sm font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Request submitted. Our team will configure this in Google Admin and notify you when complete.
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="bg-card rounded-xl border border-border shadow-card p-6">
            <h2 className="text-sm font-bold text-foreground mb-5 flex items-center gap-2"><Plus className="w-4 h-4 text-primary" /> New BCC Surveillance Request</h2>
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Domain */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> Domain</label>
                <select value={domain} onChange={e => setDomain(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-surface-2 border border-border/50 focus:border-primary/50 focus:outline-none text-sm text-foreground">
                  {domains.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
              </div>

              {/* Affected Users */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Affected Users</label>
                <div className="flex gap-3">
                  {(["all","specific"] as const).map(type => (
                    <button key={type} type="button" onClick={() => setAffectedType(type)}
                      className={cn("flex-1 py-2 rounded-lg border text-sm font-medium transition-all",
                        affectedType === type ? "bg-primary/10 border-primary/30 text-primary" : "bg-surface-2 border-border/50 text-muted-foreground hover:border-primary/20")}>
                      {type === "all" ? "All Users" : "Specific Users"}
                    </button>
                  ))}
                </div>
                {affectedType === "specific" && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {usersLoading ? (
                      <div className="col-span-2 flex items-center gap-2 text-xs text-muted-foreground py-2">
                        <Loader2 className="w-3 h-3 animate-spin" /> Loading users…
                      </div>
                    ) : domainUsers.map(u => (
                      <label key={u.id} className={cn("flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all text-sm",
                        specificUsers.includes(u.email) ? "bg-primary/10 border-primary/30 text-primary" : "bg-surface-2 border-border/50 text-muted-foreground hover:border-primary/20")}>
                        <input type="checkbox" checked={specificUsers.includes(u.email)} onChange={() => toggleUser(u.email)} className="accent-primary" />
                        <span className="truncate">{u.email}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Surveillance Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Surveillance Email (BCC Recipient)</label>
                <input type="email" value={surveillanceEmail} onChange={e => setSurveillanceEmail(e.target.value)}
                  placeholder="e.g. data@yourcompany.com"
                  className="w-full h-10 px-3 rounded-lg bg-surface-2 border border-border/50 focus:border-primary/50 focus:outline-none text-sm text-foreground" required />
                <p className="text-[11px] text-muted-foreground">All matching emails will be BCC'd to this address silently.</p>
              </div>

              {/* Directions */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email Directions to Monitor</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(Object.keys(directionLabels) as BccDirection[]).map(dir => {
                    const { label, desc } = directionLabels[dir];
                    const checked = directions.includes(dir);
                    return (
                      <label key={dir} onClick={() => toggleDirection(dir)}
                        className={cn("flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                          checked ? "bg-primary/10 border-primary/30" : "bg-surface-2 border-border/50 hover:border-primary/20")}>
                        <input type="checkbox" checked={checked} onChange={() => toggleDirection(dir)} className="accent-primary mt-0.5" />
                        <div>
                          <p className={cn("text-sm font-semibold", checked ? "text-primary" : "text-foreground")}>{label}</p>
                          <p className="text-[11px] text-muted-foreground">{desc}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-start gap-2.5 px-4 py-3 rounded-lg bg-warning/10 border border-warning/20">
                <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                <p className="text-xs text-warning">This will be configured server-side in Google Admin. End users will <strong>not</strong> be notified. Ensure compliance with your organisation's privacy policy.</p>
              </div>

              {submitErr && <p className="text-sm text-red-600">{submitErr}</p>}

              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={submitting || directions.length === 0 || !surveillanceEmail}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-semibold glow-primary transition-all disabled:opacity-50">
                  {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : "Submit Request"}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-5 py-2.5 rounded-lg bg-surface-3 hover:bg-surface-2 text-muted-foreground text-sm font-medium transition-all">
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">Surveillance Requests</h2>
          <span className="text-xs text-muted-foreground">{requests.length} request{requests.length !== 1 ? "s" : ""}</span>
        </div>
        {reqLoading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : requests.length === 0 ? (
          <div className="py-16 text-center">
            <Eye className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No surveillance requests yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {requests.map((req, i) => (
              <motion.div key={req.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                className="flex items-center gap-4 px-5 py-4 hover:bg-surface-2 transition-colors cursor-pointer group"
                onClick={() => navigate(`/surveillance/${req.id}`)}>
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Eye className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-foreground">{req.domain}</p>
                    <StatusBadge status={req.status} />
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    BCC → <span className="font-medium text-foreground">{req.surveillance_email}</span>
                    {" · "}
                    {Array.isArray(req.directions) ? req.directions.map(d => directionLabels[d]?.label ?? d).join(", ") : req.directions}
                    {" · "}
                    {req.affected_users === "all" ? "All users" : `${(req.affected_users as string[]).length} user(s)`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground">{new Date(req.requested_at).toLocaleDateString("en-IN")}</p>
                  {req.completed_at && <p className="text-[10px] text-success">Done {new Date(req.completed_at).toLocaleDateString("en-IN")}</p>}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
