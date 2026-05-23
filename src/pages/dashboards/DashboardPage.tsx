import { motion } from "framer-motion";
import { Users, Globe, CreditCard, AlertTriangle, TrendingUp, Shield, Activity, Building2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { mockBillingEntities, mockUsers, mockSecurityAlerts, mockInvoices } from "../../mock/data";

const fade = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } };

function StatCard({ icon: Icon, label, value, sub, color, delay = 0 }: { icon: any; label: string; value: string | number; sub?: string; color: string; delay?: number }) {
  return (
    <motion.div {...fade} transition={{ delay }} className="bg-card rounded-xl border border-border p-5 shadow-card hover:shadow-card-hover transition-all duration-200 group">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <TrendingUp className="w-4 h-4 text-success opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <p className="text-2xl font-bold text-foreground mb-0.5">{value}</p>
      <p className="text-sm font-medium text-foreground">{label}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </motion.div>
  );
}

function AlertRow({ alert }: { alert: any }) {
  const colors: Record<string, string> = { high: "text-danger bg-danger/10 border-danger/20", medium: "text-warning bg-warning/10 border-warning/20", low: "text-success bg-success/10 border-success/20" };
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-2 transition-colors">
      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${colors[alert.severity]}`}>{alert.severity}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{alert.message}</p>
        <p className="text-xs text-muted-foreground">{alert.userName} · {alert.domain}</p>
      </div>
      {!alert.resolved && <span className="w-2 h-2 rounded-full bg-danger animate-pulse-slow shrink-0" />}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const totalUsers = mockUsers.length;
  const totalDomains = mockBillingEntities.flatMap(b => b.domains).length;
  const activeAlerts = mockSecurityAlerts.filter(a => !a.resolved).length;
  const pendingInvoices = mockInvoices.filter(i => i.status === "pending").length;
  const totalRevenue = mockInvoices.filter(i => i.status === "paid").reduce((s, i) => s + i.amount, 0);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Welcome */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Good morning, {user?.name?.split(" ")[0]} 👋</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Here's what's happening across your email solution today.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Users" value={totalUsers} sub="Across all domains" color="bg-primary/10 text-primary" delay={0} />
        <StatCard icon={Globe} label="Active Domains" value={totalDomains} sub="Managed OUs" color="bg-success/10 text-success" delay={0.05} />
        <StatCard icon={AlertTriangle} label="Security Alerts" value={activeAlerts} sub="Unresolved" color="bg-danger/10 text-danger" delay={0.1} />
        <StatCard icon={CreditCard} label="Pending Invoices" value={pendingInvoices} sub={`₹${totalRevenue.toLocaleString("en-IN")} collected`} color="bg-warning/10 text-warning" delay={0.15} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* License pools */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border shadow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-foreground">License Pools</h2>
            <Building2 className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="space-y-4">
            {mockBillingEntities.map(be => (
              <div key={be.id}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-foreground">{be.name}</p>
                  <p className="text-xs text-muted-foreground">{be.domains.length} domain{be.domains.length > 1 ? "s" : ""}</p>
                </div>
                {(["basic","pro","enterprise","premium"] as const).map(plan => {
                  const pool = be.licensePool[plan];
                  if (!pool.allocated) return null;
                  const pct = Math.round((pool.used / pool.allocated) * 100);
                  const colors: Record<string, string> = { basic: "bg-slate-400", pro: "bg-primary", enterprise: "bg-primary-dim", premium: "bg-accent" };
                  return (
                    <div key={plan} className="flex items-center gap-3 mb-1.5">
                      <span className="text-[10px] font-semibold uppercase text-muted-foreground w-20 capitalize">{plan}</span>
                      <div className="flex-1 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${colors[plan]} transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground w-16 text-right">{pool.used}/{pool.allocated}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Security alerts */}
        <div className="bg-card rounded-xl border border-border shadow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-foreground">Recent Alerts</h2>
            <Shield className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            {mockSecurityAlerts.map(a => <AlertRow key={a.id} alert={a} />)}
          </div>
          <button className="mt-3 w-full text-xs text-primary hover:text-primary-glow font-semibold transition-colors">View all alerts →</button>
        </div>
      </div>

      {/* Recent users */}
      <div className="bg-card rounded-xl border border-border shadow-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-foreground">Recent Users</h2>
          <Activity className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Name","Email","Domain","Plan","Status","Last Login"].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {mockUsers.slice(0, 5).map(u => {
                const daysSince = u.lastLogin ? Math.floor((Date.now() - new Date(u.lastLogin).getTime()) / 86400000) : null;
                const stale = daysSince !== null && daysSince > 30;
                const planColors: Record<string, string> = { basic: "bg-slate-100 text-slate-600", pro: "bg-primary/10 text-primary", enterprise: "bg-primary-dim/10 text-primary-dim", premium: "bg-accent/10 text-accent" };
                const statusColors: Record<string, string> = { active: "bg-success/10 text-success", suspended: "bg-danger/10 text-danger", pending: "bg-warning/10 text-warning" };
                return (
                  <tr key={u.id} className="hover:bg-surface-2 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-foreground">{u.firstName} {u.lastName}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{u.email}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{u.domain}</td>
                    <td className="py-2.5 px-3"><span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${planColors[u.plan]}`}>{u.plan}</span></td>
                    <td className="py-2.5 px-3"><span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${statusColors[u.status]}`}>{u.status}</span></td>
                    <td className={`py-2.5 px-3 text-xs ${stale ? "text-danger font-semibold" : "text-muted-foreground"}`}>
                      {daysSince === null ? "Never" : daysSince === 0 ? "Today" : `${daysSince}d ago`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <p className="text-center text-[11px] text-muted-foreground pb-2">Powered by <span className="font-semibold">TechnoDoc Solutions</span></p>
    </div>
  );
}
