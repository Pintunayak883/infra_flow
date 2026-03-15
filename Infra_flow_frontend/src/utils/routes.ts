export const ROUTES = {
  login: '/login',
  register: '/register',
  adminLogin: '/admin-login',
  dashboard: '/dashboard/student',
  worker: '/dashboard/worker',
  admin: '/dashboard/admin',
  authority: '/dashboard/admin',
  complaintForm: '/submit-complaint',
  complaintHistory: '/complaints',
  complaintScan: '/complaints/scan',
};

export type AppUserRole = 'student' | 'worker' | 'admin' | 'authority';

export const getDashboardRouteByRole = (role?: AppUserRole) => {
  if (role === 'worker') return ROUTES.worker;
  if (role === 'admin') return ROUTES.admin;
  if (role === 'authority') return ROUTES.authority;
  return ROUTES.dashboard;
};
