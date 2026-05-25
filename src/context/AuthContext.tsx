import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { AuthUser } from '../types';
import { api, setToken as storeToken, clearToken } from '../lib/api';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (user: AuthUser, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('ldis_token'));
  const [loading, setLoading] = useState(true);

  // On mount: if token exists, restore user from API
  useEffect(() => {
    const stored = localStorage.getItem('ldis_token');
    if (!stored) { setLoading(false); return; }
    api.get<{ user: { id: number; name: string; email: string; role: string; userType: string } }>('/auth/me')
      .then(res => {
        const me = res.user;
        setUser({ id: String(me.id), name: me.name, email: me.email, role: me.role as AuthUser['role'] });
      })
      .catch(() => {
        clearToken();
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, []);

  function login(u: AuthUser, tok: string) {
    storeToken(tok);
    setToken(tok);
    setUser(u);
  }

  function logout() {
    clearToken();
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
