import apiClient from './apiClient';

interface RegisterPayload {
  name: string;
  rollNumber?: string;
  mobileNumber?: string;
  department?: string;
  email: string;
  password: string;
  role: 'student' | 'worker' | 'admin' | 'authority';
  skills?: string[];
}

interface LoginPayload {
  role: 'student' | 'worker' | 'admin' | 'authority';
  rollNumber?: string;
  mobileNumber?: string;
  email?: string;
  username?: string;
  password: string;
}

interface AdminLoginPayload {
  username: string;
  password: string;
}

export const registerUser = async (payload: RegisterPayload) => {
  const { data } = await apiClient.post('/auth/register', payload);
  return data;
};

export const loginUser = async (payload: LoginPayload) => {
  const { data } = await apiClient.post('/auth/login', payload);
  return data;
};

export const adminLogin = async (payload: AdminLoginPayload) => {
  const { data } = await apiClient.post('/auth/admin-login', payload);
  return data;
};
