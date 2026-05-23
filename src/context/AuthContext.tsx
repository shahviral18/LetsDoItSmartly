import { createContext, useContext, useState, type ReactNode } from 'react';
import type { AuthUser } from '../types';
import { mockAuthUsers } from '../mock/data';

type AuthState =
  | { status: 'unauthenticated' }
  | { status: 'force_reset'; user: AuthUser }
  | { status: 'authenticated'; user: AuthUser };

interface AuthContextValue {
  auth: AuthState;
  login: (email: string, password: string) => Promise<'ok' | 'force_reset' | 'invalid'>;
  logout: () => void;
  completeForceReset: () => void;
  currentDomainId: string | null;
  setCurrentDomainId: (id: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Simulated credentials — any password works; force_reset triggered by "reset123"
const FORCE_RESET_PASSWORD = 'reset123';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({ status: 'unauthenticated' });
  const [currentDomainId, setCurrentDomainId] = useState<string | null>('d1');

  async function login(email: string, password: string): Promise<'ok' | 'force_reset' | 'invalid'> {
    const user = Object.values(mockAuthUsers).find(u => u.email === email);
    if (!user) return 'invalid';
    if (password === FORCE_RESET_PASSWORD) {
      setAuth({ status: 'force_reset', user });
      return 'force_reset';
    }
    setAuth({ status: 'authenticated', user });
    return 'ok';
  }

  function logout() {
    setAuth({ status: 'unauthenticated' });
  }

  function completeForceReset() {
    if (auth.status === 'force_reset') {
      setAuth({ status: 'authenticated', user: auth.user });
    }
  }

  return (
    <AuthContext.Provider value={{ auth, login, logout, completeForceReset, currentDomainId, setCurrentDomainId }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
