import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { LoginPage } from '@/features/auth/LoginPage';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';

import { ApplicantList } from '@/features/applicants/ApplicantList';
import { OfferList } from '@/features/offers/OfferList';
import { OfferEditor } from '@/features/offers/OfferEditor';
import { OfferPublicView } from '@/features/offers/OfferPublicView';

import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { EmployeeList } from '@/features/employees/EmployeeList';

// Placeholder components for pages
// const Dashboard = () => <div><h1 className="text-2xl font-bold">Dashboard</h1><p className="mt-4">Welcome to the HR Command Centre.</p></div>;
import { SettingsPage } from '@/features/settings/SettingsPage';

// Placeholder components for pages
// const Dashboard = () => <div><h1 className="text-2xl font-bold">Dashboard</h1><p className="mt-4">Welcome to the HR Command Centre.</p></div>;

import { ThemeProvider } from '@/components/theme-provider';

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/offer/:token" element={<OfferPublicView />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="applicants" element={<ApplicantList />} />
              <Route path="offers" element={<OfferList />} />
              <Route path="offers/new" element={<OfferEditor />} />
              <Route path="employees" element={<EmployeeList />} />
              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
