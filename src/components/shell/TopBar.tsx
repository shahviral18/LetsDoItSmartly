import { Menu, Bell, Globe } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useDomain } from "../../context/DomainContext";
import { useLocation } from "react-router-dom";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard", "/users": "Users", "/domains": "Domains",
  "/storage": "Storage", "/shared-drives": "Shared Drives",
  "/billing/buy": "Buy Licenses", "/billing/invoices": "Invoices",
  "/security/alerts": "Security Alerts", "/security/logins": "Login History",
  "/security/audit": "Audit Log", "/distributors": "Distributors",
  "/distributor/clients": "My Clients", "/admin/coupons": "Coupons",
  "/admin/super": "Super Admin Panel", "/surveillance": "Email Surveillance",
};

export function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user } = useAuth();
  const { domains, selectedDomain, setSelectedDomain } = useDomain();
  const location = useLocation();
  const isDomainOwner = user?.role === "domain_owner";
  const title = pageTitles[location.pathname] ?? "Dashboard";

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 md:px-6 shrink-0 gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <button onClick={onMenuClick} className="md:hidden p-2 rounded-lg text-muted-foreground hover:bg-surface-3 transition-colors">
          <Menu className="w-5 h-5" />
        </button>
        <h2 className="text-sm font-bold text-foreground leading-tight">{title}</h2>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {isDomainOwner && domains.length > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-2 border border-border text-sm">
            <Globe className="w-3.5 h-3.5 text-primary" />
            <select
              value={selectedDomain?.id ?? ''}
              onChange={e => {
                const d = domains.find(x => x.id === Number(e.target.value));
                if (d) setSelectedDomain(d);
              }}
              className="bg-transparent text-foreground text-xs font-medium focus:outline-none cursor-pointer"
            >
              {domains.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        )}
        <button className="relative p-2 rounded-lg text-muted-foreground hover:bg-surface-3 transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-danger" />
        </button>
      </div>
    </header>
  );
}
