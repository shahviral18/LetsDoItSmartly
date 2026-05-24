import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Globe, Users, HardDrive, Shield, Loader2 } from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

interface ApiDomain {
  id: number;
  name: string;
  ou_path: string;
  billing_entity_name?: string;
  user_count?: number;
  two_sv_count?: number;
  storage_used_mb?: number;
  storage_total_mb?: number;
}

export default function DomainDashboardPage() {
  const { user } = useAuth();
  const [domains, setDomains] = useState<ApiDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isDomainOwner = user?.role === 'domain_owner';

  useEffect(() => {
    const endpoint = isDomainOwner ? '/my/domains' : '/domains/stats';
    api.get<{ data: ApiDomain[] }>(endpoint)
      .then(r => setDomains(r.data))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [isDomainOwner]);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-foreground">Domains</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {loading ? 'Loading…' : `${domains.length} domain${domains.length !== 1 ? 's' : ''} managed`}
        </p>
      </div>

      {error && <div className="px-4 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-4">
          {domains.map((domain, i) => {
            const usedGb  = domain.storage_used_mb  ? (domain.storage_used_mb  / 1024).toFixed(1) : '0';
            const totalGb = domain.storage_total_mb ? (domain.storage_total_mb / 1024).toFixed(1) : '0';
            const uc = domain.user_count ?? 0;
            const twoSv = domain.two_sv_count ?? 0;
            return (
              <motion.div key={domain.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="bg-card rounded-xl border border-border shadow-card p-5 hover:shadow-card-hover transition-all duration-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Globe className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{domain.name}</p>
                      <p className="text-xs text-muted-foreground">{domain.ou_path}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {domain.billing_entity_name && !isDomainOwner && (
                      <span className="text-xs text-muted-foreground">{domain.billing_entity_name}</span>
                    )}
                    <span className="text-xs font-semibold px-2 py-1 rounded-lg bg-success/10 text-success border border-success/20">Active</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <div><p className="text-sm font-bold text-foreground">{uc}</p><p className="text-xs text-muted-foreground">Users</p></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-muted-foreground" />
                    <div><p className="text-sm font-bold text-foreground">{usedGb} GB</p><p className="text-xs text-muted-foreground">of {totalGb} GB</p></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-muted-foreground" />
                    <div><p className="text-sm font-bold text-foreground">{twoSv}/{uc}</p><p className="text-xs text-muted-foreground">2SV on</p></div>
                  </div>
                </div>
              </motion.div>
            );
          })}
          {domains.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-sm">No domains found. Run Google Sync first.</div>
          )}
        </div>
      )}
    </div>
  );
}
