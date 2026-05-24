import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Copy, CheckCheck, AlertTriangle, Clock, CheckCircle2,
  XCircle, PlayCircle, ExternalLink, Shield, FolderOpen,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { mockBccRequests } from "../../mock/data";
import type { BccRequest, BccStatus } from "../../types";
import { cn } from "../../lib/utils";

const statusConfig: Record<BccStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending:     { label: "Pending",     color: "text-warning bg-warning/10 border-warning/30",     icon: <Clock className="w-3.5 h-3.5" /> },
  in_progress: { label: "In Progress", color: "text-primary bg-primary/10 border-primary/30",     icon: <PlayCircle className="w-3.5 h-3.5" /> },
  completed:   { label: "Completed",   color: "text-success bg-success/10 border-success/30",     icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  rejected:    { label: "Rejected",    color: "text-danger bg-danger/10 border-danger/30",        icon: <XCircle className="w-3.5 h-3.5" /> },
};

const directionLabels: Record<string, string> = {
  outbound:            "Outbound (emails sent outside org)",
  inbound:             "Inbound (emails received from outside)",
  internal_sending:    "Internal Sending (emails sent within org)",
  internal_receiving:  "Internal Receiving (emails received within org)",
};

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex items-center gap-2 rounded-lg bg-surface-2 border border-border/50 px-3 py-2">
      <span className="text-xs text-muted-foreground w-32 shrink-0">{label}</span>
      <span className="text-sm font-mono text-foreground flex-1 truncate">{value}</span>
      <button onClick={copy} className={cn("shrink-0 transition-colors", copied ? "text-success" : "text-muted-foreground hover:text-primary")}>
        {copied ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
}

function Step({ num, text }: { num: number; text: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-xs font-bold text-primary mt-0.5">
        {num}
      </div>
      <p className="text-sm text-foreground leading-relaxed pt-1">{text}</p>
    </div>
  );
}

export default function BccRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isStaff = user?.role !== "domain_owner";

  const [requests, setRequests] = useState<BccRequest[]>(mockBccRequests);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);

  const req = requests.find(r => r.id === id);
  if (!req) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Request not found.</p>
        <button onClick={() => navigate("/surveillance")} className="mt-4 text-sm text-primary hover:underline">
          ← Back to Email Surveillance
        </button>
      </div>
    );
  }

  const updateStatus = async (newStatus: BccStatus, note?: string) => {
    setActionLoading(newStatus);
    await new Promise(r => setTimeout(r, 800));
    setRequests(prev => prev.map(r => r.id === req.id ? {
      ...r,
      status: newStatus,
      completedBy: newStatus === "completed" ? (user?.name ?? "Staff") : r.completedBy,
      completedAt: newStatus === "completed" ? new Date().toISOString() : r.completedAt,
      notes: note ?? r.notes,
    } : r));
    setActionLoading(null);
    setShowRejectInput(false);
    if (newStatus === "completed") navigate("/surveillance");
  };

  const affectedUsersText = req.affectedUsers === "all"
    ? "All users in OU"
    : (req.affectedUsers as string[]).join(", ");

  const status = statusConfig[req.status];

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/surveillance")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm text-foreground font-medium">BCC Request — {req.domain}</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Email Surveillance Request</h1>
          <p className="text-sm text-muted-foreground mt-0.5">ID: {req.id} · Submitted {new Date(req.requestedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
        </div>
        <span className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border", status.color)}>
          {status.icon}{status.label}
        </span>
      </div>

      {/* Request Summary */}
      <div className="glass rounded-2xl p-5 border border-border/50 space-y-3">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" /> Request Summary
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <CopyField label="Domain" value={req.domain} />
          <CopyField label="OU Path" value={req.ouPath} />
          <CopyField label="Surveillance Email" value={req.surveillanceEmail} />
          <div className="flex items-start gap-2 rounded-lg bg-surface-2 border border-border/50 px-3 py-2">
            <span className="text-xs text-muted-foreground w-32 shrink-0 pt-0.5">Affected Users</span>
            <span className="text-sm text-foreground flex-1">{affectedUsersText}</span>
          </div>
        </div>
        <div className="rounded-lg bg-surface-2 border border-border/50 px-3 py-2">
          <span className="text-xs text-muted-foreground block mb-1.5">Directions to configure</span>
          <div className="flex flex-wrap gap-1.5">
            {req.directions.map(d => (
              <span key={d} className="px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-xs text-primary font-medium">
                {directionLabels[d]}
              </span>
            ))}
          </div>
        </div>
        {req.notes && (
          <div className="flex items-start gap-2 rounded-lg bg-warning/5 border border-warning/20 px-3 py-2">
            <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <p className="text-sm text-foreground">{req.notes}</p>
          </div>
        )}
        {req.completedBy && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="w-3.5 h-3.5 text-success" />
            Completed by <span className="text-foreground font-medium">{req.completedBy}</span>
            {req.completedAt && <> on {new Date(req.completedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</>}
          </div>
        )}
      </div>

      {/* Step-by-step Instructions — staff only */}
      {isStaff && req.status !== "rejected" && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-5 border border-border/50 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-primary" /> Google Admin Setup Instructions
            </h2>
            <a href="https://admin.google.com" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline">
              Open Admin Console <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="space-y-4">
            <Step num={1} text={<>Open <strong>Google Admin Console</strong> at <code className="bg-surface-2 px-1 rounded text-xs">admin.google.com</code></>} />
            <Step num={2} text={<>Navigate to <strong>Apps → Google Workspace → Gmail → Compliance</strong></>} />
            <Step num={3} text={<>Scroll down to <strong>"Content compliance"</strong> and click <strong>Configure</strong></>} />
            <Step num={4} text={<>Set the rule name to: <code className="bg-surface-2 px-1.5 py-0.5 rounded text-xs font-mono">BCC Surveillance — {req.domain} — {new Date(req.requestedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</code></>} />
            <Step num={5} text={
              <>
                Under <strong>"Email messages to affect"</strong>, check the following:
                <ul className="mt-2 space-y-1 ml-1">
                  {req.directions.map(d => (
                    <li key={d} className="flex items-center gap-2 text-xs text-foreground">
                      <CheckCheck className="w-3.5 h-3.5 text-success shrink-0" />
                      {directionLabels[d]}
                    </li>
                  ))}
                </ul>
                {req.affectedUsers === "all"
                  ? <p className="mt-2 text-xs text-muted-foreground">This applies to <strong>all users</strong> in the OU.</p>
                  : <p className="mt-2 text-xs text-muted-foreground">Applies to specific users: <span className="font-mono">{(req.affectedUsers as string[]).join(", ")}</span></p>
                }
              </>
            } />
            <Step num={6} text={<>Under <strong>"Add expressions"</strong> → select <strong>"Advanced content filter"</strong> → set condition to match all messages</>} />
            <Step num={7} text={
              <>
                Click <strong>"Also deliver to"</strong> and add the surveillance email:<br />
                <div className="mt-2">
                  <CopyField label="Surveillance Email" value={req.surveillanceEmail} />
                </div>
              </>
            } />
            <Step num={8} text={
              <>
                Under <strong>"Account &amp; organizational unit"</strong> → select the OU:<br />
                <div className="mt-2">
                  <CopyField label="OU Path" value={req.ouPath} />
                </div>
              </>
            } />
            <Step num={9} text={<>Click <strong>Save</strong> → then click <strong>Apply</strong> to activate the rule</>} />
            <Step num={10} text={<>Verify the rule appears in the Content Compliance list — confirm it's <strong>Enabled</strong></>} />
          </div>

          <div className="pt-2 border-t border-border/50 bg-warning/5 rounded-xl px-4 py-3 flex gap-2">
            <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Google Admin changes take effect within <strong>15–30 minutes</strong>. BCC rules are applied globally per OU and cannot be scoped to individual users via this method.
            </p>
          </div>
        </motion.div>
      )}

      {/* Staff Actions */}
      {isStaff && req.status !== "completed" && req.status !== "rejected" && (
        <div className="glass rounded-2xl p-5 border border-border/50 space-y-4">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Update Status</h2>
          <div className="flex flex-wrap gap-3">
            {req.status === "pending" && (
              <button
                onClick={() => updateStatus("in_progress")}
                disabled={actionLoading !== null}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-sm font-medium transition-all disabled:opacity-50"
              >
                {actionLoading === "in_progress" ? <span className="w-4 h-4 border-2 border-primary/40 border-t-primary rounded-full animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                Mark In Progress
              </button>
            )}
            <button
              onClick={() => updateStatus("completed")}
              disabled={actionLoading !== null}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-success/10 hover:bg-success/20 text-success border border-success/30 text-sm font-medium transition-all disabled:opacity-50"
            >
              {actionLoading === "completed" ? <span className="w-4 h-4 border-2 border-success/40 border-t-success rounded-full animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Mark as Done
            </button>
            <button
              onClick={() => setShowRejectInput(!showRejectInput)}
              disabled={actionLoading !== null}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-danger/10 hover:bg-danger/20 text-danger border border-danger/30 text-sm font-medium transition-all disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" /> Reject Request
            </button>
          </div>
          {showRejectInput && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-2">
              <textarea
                value={rejectNote}
                onChange={e => setRejectNote(e.target.value)}
                placeholder="Reason for rejection (optional)..."
                rows={3}
                className="w-full rounded-lg bg-surface-2 border border-border/50 focus:border-danger/50 focus:outline-none focus:ring-1 focus:ring-danger/30 text-sm text-foreground p-3 resize-none transition-colors"
              />
              <button
                onClick={() => updateStatus("rejected", rejectNote || undefined)}
                disabled={actionLoading !== null}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-danger hover:bg-danger/90 text-white text-sm font-medium transition-all disabled:opacity-50"
              >
                {actionLoading === "rejected" ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <XCircle className="w-4 h-4" />}
                Confirm Rejection
              </button>
            </motion.div>
          )}
        </div>
      )}

      {/* Domain Owner read-only status panel */}
      {!isStaff && (
        <div className="glass rounded-2xl p-5 border border-border/50">
          <div className="flex items-start gap-3">
            {req.status === "pending" && <Clock className="w-5 h-5 text-warning mt-0.5 shrink-0" />}
            {req.status === "in_progress" && <PlayCircle className="w-5 h-5 text-primary mt-0.5 shrink-0" />}
            {req.status === "completed" && <CheckCircle2 className="w-5 h-5 text-success mt-0.5 shrink-0" />}
            {req.status === "rejected" && <XCircle className="w-5 h-5 text-danger mt-0.5 shrink-0" />}
            <div>
              <p className="text-sm font-medium text-foreground">
                {req.status === "pending" && "Your request is awaiting review by our support team."}
                {req.status === "in_progress" && "Our support team is currently configuring this in Google Admin."}
                {req.status === "completed" && "Configuration is complete. BCC rules are now active (may take 15–30 min to propagate)."}
                {req.status === "rejected" && "This request has been rejected."}
              </p>
              {req.notes && <p className="text-xs text-muted-foreground mt-1">{req.notes}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
