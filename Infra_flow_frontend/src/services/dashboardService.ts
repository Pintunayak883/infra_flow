import apiClient from './apiClient';

export const fetchAdminDashboardData = async () => {
  const { data } = await apiClient.get('/admin/dashboard-data');
  return data;
};
