import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, Globe, CreditCard, AlertTriangle, TrendingUp, Building2, Loader2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";

const fade = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } };

interface Stats {
  totalUsers: number;
  activeUsers: number;
  totalDomains: number;
  totalBillingEntities: number;
  pendingInvoices: number;
  totalRevenue: number;
  unresolved2svUsers: number;
  licensePools: { name: string; slug: string; plans: { slug: string; allocated: number; used: number }[] }[];
}

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

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Stats>('/dashboard/stats')
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const planColors: Record<string, string> = {
    basic: 'bg-slate-400', pro: 'bg-primary', enterprise: 'bg-indigo-500', premium: 'bg-cyan-500',
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-foreground">Good {getGreeting()}, {user?.name?.split(" ")[0]}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Here's what's happening across your email solution today.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Users" value={stats?.totalUsers ?? 0} sub={`${stats?.activeUsers ?? 0} active`} color="bg-primary/10 text-primary" delay={0} />
        <StatCard icon={Globe} label="Active Domains" value={stats?.totalDomains ?? 0} sub={`${stats?.totalBillingEntities ?? 0} billing entities`} color="bg-success/10 text-success" delay={0.05} />
        <StatCard icon={AlertTriangle} label="2SV Disabled" value={stats?.unresolved2svUsers ?? 0} sub="Users at risk" color="bg-danger/10 text-danger" delay={0.1} />
        <StatCard icon={CreditCard} label="Pending Invoices" value={stats?.pendingInvoices ?? 0} sub={`₹${(stats?.totalRevenue ?? 0).toLocaleString('en-IN')} collected`} color="bg-warning/10 text-warning" delay={0.15} />
      </div>

      {/* License pools */}
      <div className="bg-card rounded-xl border border-border shadow-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-foreground">License Pools</h2>
          <Building2 className="w-4 h-4 text-muted-foreground" />
        </div>
        {!stats?.licensePools?.length ? (
          <p className="text-sm text-muted-foreground">No license pool data.</p>
        ) : (
          <div className="space-y-5">
            {stats.licensePools.map(be => (
              <div key={be.slug}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-foreground">{be.name}</p>
                </div>
                {be.plans.filter(p => p.allocated > 0).map(p => {
                  const pct = Math.round((p.used / p.allocated) * 100);
                  return (
                    <div key={p.slug} className="mb-2">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span className="capitalize">{p.slug}</span>
                        <span>{p.used}/{p.allocated} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-border overflow-hidden">
                        <div className={`h-full rounded-full ${planColors[p.slug] ?? 'bg-slate-400'}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
