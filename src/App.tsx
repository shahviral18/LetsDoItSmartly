import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { GuestRoute } from './router/GuestRoute';
import { ProtectedRoute } from './router/ProtectedRoute';
import { AppShell } from './components/shell/AppShell';
import { LoginPage } from './pages/auth/LoginPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ForceResetPage } from './pages/auth/ForceResetPage';
import { DashboardPage } from './pages/dashboards/DashboardPage';
import { DomainDashboardPage } from './pages/domain/DomainDashboardPage';
import { UsersPage } from './pages/users/UsersPage';
import { UserDetailPage } from './pages/users/UserDetailPage';
import { StoragePage } from './pages/users/StoragePage';
import { SharedDrivesPage } from './pages/users/SharedDrivesPage';
import { InvoicesPage } from './pages/billing/InvoicesPage';
import { InvoiceDetailPage } from './pages/billing/InvoiceDetailPage';
import { BuyLicensesPage } from './pages/billing/BuyLicensesPage';
import { UpgradePlanPage } from './pages/billing/UpgradePlanPage';
import { DistributorDashboardPage } from './pages/distributor/DistributorDashboardPage';
import AdminLayout from './components/layout/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import SuperAdminPanel from './pages/admin/SuperAdminPanel';
import SecurityAlertsPage from './pages/admin/SecurityAlertsPage';
import LoginHistoryPage from './pages/admin/LoginHistoryPage';
import AuditLogPage from './pages/admin/AuditLogPage';
import BackofficePage from './pages/admin/BackofficePage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public auth routes — redirect away if already logged in */}
          <Route element={<GuestRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          </Route>

          {/* Force reset — accessible only when status === force_reset */}
          <Route path="/force-reset" element={<ForceResetPage />} />

          {/* Protected app routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/app/dashboard" element={<DashboardPage />} />
              {/* Track 2 — User & Domain Management */}
              <Route path="/app/domain-dashboard" element={<DomainDashboardPage />} />
              <Route path="/app/users" element={<UsersPage />} />
              <Route path="/app/users/:userId" element={<UserDetailPage />} />
              <Route path="/app/storage" element={<StoragePage />} />
              <Route path="/app/drives" element={<SharedDrivesPage />} />
              {/* Billing & Payments — Track 3 */}
              <Route path="/app/invoices" element={<InvoicesPage />} />
              <Route path="/app/invoices/:id" element={<InvoiceDetailPage />} />
              <Route path="/app/buy-licenses" element={<BuyLicensesPage />} />
              <Route path="/app/upgrade-plan" element={<UpgradePlanPage />} />
              {/* Distributor */}
              <Route path="/app/distributor" element={<DistributorDashboardPage />} />
              {/* Stub routes — content built in later tracks */}
              <Route path="/app/billing" element={<StubPage title="Billing Entities" />} />
              <Route path="/app/security" element={<StubPage title="Security" />} />
              <Route path="/app/support" element={<StubPage title="Support Queue" />} />
              <Route path="/app/audit" element={<StubPage title="Audit Log" />} />
              <Route path="/app/reports" element={<StubPage title="Reports" />} />
              <Route path="/app/domains" element={<StubPage title="Domains" />} />
              <Route path="/app/settings" element={<StubPage title="Settings" />} />
            </Route>

            {/* Track 4 — Admin & Audit */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<SuperAdminPanel />} />
              <Route path="security-alerts" element={<SecurityAlertsPage />} />
              <Route path="login-history" element={<LoginHistoryPage />} />
              <Route path="audit-log" element={<AuditLogPage />} />
              <Route path="backoffice" element={<BackofficePage />} />
              <Route path="dashboard" element={<AdminDashboard />} />
            </Route>
          </Route>

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

function StubPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: '#F0F7FF' }}>
        <span className="text-2xl">🚧</span>
      </div>
      <h2 className="text-lg font-semibold text-slate-700">{title}</h2>
      <p className="text-sm text-slate-400 mt-1">This section will be built in a future track.</p>
    </div>
  );
}
