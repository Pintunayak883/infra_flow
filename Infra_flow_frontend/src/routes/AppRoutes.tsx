import { Navigate, Route, Routes } from 'react-router-dom';
import Login from '../pages/Login';
import Register from '../pages/Register';
import AdminLogin from '../pages/AdminLogin';
import StudentDashboard from '../pages/StudentDashboard';
import WorkerDashboard from '../pages/WorkerDashboard';
import AdminDashboard from '../pages/AdminDashboard';
import AuthorityDashboard from '../pages/AuthorityDashboard';
import ComplaintForm from '../pages/ComplaintForm';
import ComplaintHistory from '../pages/ComplaintHistory';
import QrScanner from '../pages/QrScanner';
import ProtectedRoute from '../components/ProtectedRoute';
import DashboardLayout from '../layouts/DashboardLayout';
import { ROUTES } from '../utils/routes';
import { useAuth } from '../hooks/useAuth';

const AdminAuthorityDashboard = () => {
  const { user } = useAuth();
  return user?.role === 'authority' ? <AuthorityDashboard /> : <AdminDashboard />;
};

const AppRoutes = () => (
  <Routes>
    <Route path={ROUTES.login} element={<Login />} />
    <Route path={ROUTES.register} element={<Register />} />
    <Route path={ROUTES.adminLogin} element={<AdminLogin />} />

    <Route element={<ProtectedRoute />}> 
      <Route element={<DashboardLayout />}>
        <Route index element={<Navigate to={ROUTES.dashboard} replace />} />

        <Route element={<ProtectedRoute allowedRoles={['student']} />}>
          <Route path={ROUTES.dashboard} element={<StudentDashboard />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['worker']} />}>
          <Route path={ROUTES.worker} element={<WorkerDashboard />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['admin', 'authority']} />}>
          <Route path={ROUTES.admin} element={<AdminAuthorityDashboard />} />
        </Route>

        <Route path={ROUTES.complaintForm} element={<ComplaintForm />} />
        <Route path={ROUTES.complaintHistory} element={<ComplaintHistory />} />
        <Route path={ROUTES.complaintScan} element={<QrScanner />} />

        {/* Backward-compatible redirects from legacy dashboard paths */}
        <Route path="/dashboard" element={<Navigate to={ROUTES.dashboard} replace />} />
        <Route path="/worker/tasks" element={<Navigate to={ROUTES.worker} replace />} />
        <Route path="/admin/dashboard" element={<Navigate to={ROUTES.admin} replace />} />
      </Route>
    </Route>

    <Route path="*" element={<Navigate to={ROUTES.login} replace />} />
  </Routes>
);

export default AppRoutes;
