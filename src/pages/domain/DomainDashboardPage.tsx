import { motion } from "framer-motion";
import { Globe, Users, HardDrive, Shield } from "lucide-react";
import { mockBillingEntities, mockUsers } from "../../mock/data";

export default function DomainDashboardPage() {
  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-foreground">Domains</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Overview of all domains under your billing entities.</p>
      </div>
      <div className="grid gap-4">
        {mockBillingEntities.flatMap(be => be.domains).map((domain, i) => {
          const users = mockUsers.filter(u => u.domain === domain.name);
          return (
            <motion.div key={domain.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-card rounded-xl border border-border shadow-card p-5 hover:shadow-card-hover transition-all duration-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"><Globe className="w-4 h-4 text-primary" /></div>
                  <div><p className="font-semibold text-foreground">{domain.name}</p><p className="text-xs text-muted-foreground">{domain.ou}</p></div>
                </div>
                <span className="text-xs font-semibold px-2 py-1 rounded-lg bg-success/10 text-success border border-success/20">Active</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-2"><Users className="w-4 h-4 text-muted-foreground" /><div><p className="text-sm font-bold text-foreground">{users.length}</p><p className="text-xs text-muted-foreground">Users</p></div></div>
                <div className="flex items-center gap-2"><HardDrive className="w-4 h-4 text-muted-foreground" /><div><p className="text-sm font-bold text-foreground">{domain.storageUsed}</p><p className="text-xs text-muted-foreground">of {domain.storageTotal}</p></div></div>
                <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-muted-foreground" /><div><p className="text-sm font-bold text-foreground">{users.filter(u => u.twoSVEnabled).length}/{users.length}</p><p className="text-xs text-muted-foreground">2SV on</p></div></div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
