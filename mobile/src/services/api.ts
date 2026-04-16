import axios, { AxiosInstance } from 'axios';
import Constants from 'expo-constants';
import { useAuthStore } from '@/stores/authStore';

const API_URL =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  'http://localhost:8000';

export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const tokens = useAuthStore.getState().tokens;
  if (tokens?.access_token) {
    config.headers.Authorization = `Bearer ${tokens.access_token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      console.warn('[api] unauthorized — logging out');
      await useAuthStore.getState().logout();
    }
    return Promise.reject(err);
  },
);

export default api;
