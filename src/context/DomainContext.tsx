import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';

export interface DomainOption {
  id: number;
  name: string;
  billing_entity_id: number;
  billing_entity_name?: string;
}

interface DomainContextValue {
  domains: DomainOption[];
  selectedDomain: DomainOption | null;
  setSelectedDomain: (d: DomainOption) => void;
  loading: boolean;
}

const DomainContext = createContext<DomainContextValue | null>(null);

export function DomainProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [domains, setDomains] = useState<DomainOption[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<DomainOption | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) { setDomains([]); setSelectedDomain(null); return; }

    const isDomainOwner = user.role === 'domain_owner';
    const isStaff = !isDomainOwner && user.role !== 'distributor';

    if (!isDomainOwner && !isStaff) return;

    setLoading(true);
    const endpoint = isDomainOwner ? '/my/domains' : '/domains';
    api.get<{ data: DomainOption[] }>(endpoint)
      .then(r => {
        const list = r.data ?? [];
        setDomains(list);
        if (list.length > 0) setSelectedDomain(prev => prev ?? list[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]);

  return (
    <DomainContext.Provider value={{ domains, selectedDomain, setSelectedDomain, loading }}>
      {children}
    </DomainContext.Provider>
  );
}

export function useDomain() {
  const ctx = useContext(DomainContext);
  if (!ctx) throw new Error('useDomain must be used within DomainProvider');
  return ctx;
}
