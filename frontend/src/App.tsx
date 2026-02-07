import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AddStorePage from './pages/onboarding/AddStorePage';
import ConnectPOSPage from './pages/onboarding/ConnectPOSPage';
import SuccessPage from './pages/onboarding/SuccessPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/onboarding/new" element={<AddStorePage />} />
          <Route path="/onboarding/:publicId/connect" element={<ConnectPOSPage />} />
          <Route path="/onboarding/:publicId/success" element={<SuccessPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
