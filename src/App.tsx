import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DomainProvider } from './context/DomainContext';
import { AppShell } from './components/shell/AppShell';
import LoginPage from './pages/auth/LoginPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ForceResetPage from './pages/auth/ForceResetPage';
import DashboardPage from './pages/dashboards/DashboardPage';
import UsersPage from './pages/users/UsersPage';
import UserDetailPage from './pages/users/UserDetailPage';
import DomainDashboardPage from './pages/domain/DomainDashboardPage';
import StoragePage from './pages/users/StoragePage';
import SharedDrivesPage from './pages/users/SharedDrivesPage';
import BuyLicensesPage from './pages/billing/BuyLicensesPage';
import InvoicesPage from './pages/billing/InvoicesPage';
import InvoiceDetailPage from './pages/billing/InvoiceDetailPage';
import UpgradePlanPage from './pages/billing/UpgradePlanPage';
import SecurityAlertsPage from './pages/admin/SecurityAlertsPage';
import LoginHistoryPage from './pages/admin/LoginHistoryPage';
import GoogleLoginHistoryPage from './pages/admin/GoogleLoginHistoryPage';
import AuditLogPage from './pages/admin/AuditLogPage';
import SuperAdminPanel from './pages/admin/SuperAdminPanel';
import DistributorDashboardPage from './pages/distributor/DistributorDashboardPage';
import BackofficePage from './pages/admin/BackofficePage';
import EmailSurveillancePage from './pages/surveillance/EmailSurveillancePage';
import BccRequestDetailPage from './pages/surveillance/BccRequestDetailPage';
import ProfilePage from './pages/profile/ProfilePage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-6 h-6 border-2 border-[#1A7DC4] border-t-transparent rounded-full animate-spin" /></div>;
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return !user ? <>{children}</> : <Navigate to="/dashboard" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
      <Route path="/force-reset" element={<ForceResetPage />} />

      <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/users/:id" element={<UserDetailPage />} />
        <Route path="/domains" element={<DomainDashboardPage />} />
        <Route path="/storage" element={<StoragePage />} />
        <Route path="/shared-drives" element={<SharedDrivesPage />} />
        <Route path="/billing/buy" element={<BuyLicensesPage />} />
        <Route path="/billing/invoices" element={<InvoicesPage />} />
        <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
        <Route path="/billing/upgrade" element={<UpgradePlanPage />} />
        <Route path="/security/alerts" element={<SecurityAlertsPage />} />
        <Route path="/security/logins" element={<LoginHistoryPage />} />
        <Route path="/security/google-logins" element={<GoogleLoginHistoryPage />} />
        <Route path="/security/audit" element={<AuditLogPage />} />
        <Route path="/admin/super" element={<SuperAdminPanel />} />
        <Route path="/admin/coupons" element={<SuperAdminPanel />} />
        <Route path="/distributor/clients" element={<DistributorDashboardPage />} />
        <Route path="/distributors" element={<BackofficePage />} />
        <Route path="/surveillance" element={<EmailSurveillancePage />} />
        <Route path="/surveillance/:id" element={<BccRequestDetailPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DomainProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </DomainProvider>
    </AuthProvider>
  );
}
