import type { ReactNode } from 'react';
import { LogoMark } from './LogoMark';

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: '#F0F7FF' }}>
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <LogoMark size={56} />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-blue-100 px-8 py-8">
          <h1 className="text-xl font-semibold text-slate-800 mb-1">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 mb-6">{subtitle}</p>}
          {!subtitle && <div className="mb-6" />}
          {children}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Powered by{' '}
          <span className="font-medium text-slate-500">TechnoDoc Solutions</span>
        </p>
      </div>
    </div>
  );
}
