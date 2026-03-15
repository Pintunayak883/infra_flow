import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('infraflow:auth');
  if (token) {
    try {
      const parsed = JSON.parse(token);
      if (parsed?.token) {
        config.headers.Authorization = `Bearer ${parsed.token}`;
      }
    } catch (error) {
      localStorage.removeItem('infraflow:auth');
    }
  }
  return config;
});

export default apiClient;
