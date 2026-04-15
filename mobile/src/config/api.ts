// mobile/src/config/api.ts
// ⚠️ ĐỔI BASE_URL thành IP VPS thật của mày

import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Ví dụ: 'http://123.456.789.0:3000/api'
export const BASE_URL = 'http://221.132.21.3:3000/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auto attach JWT token
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto handle 401 (token hết hạn)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('token');
      await SecureStore.deleteItemAsync('user');
      // App.tsx sẽ tự redirect về Login khi token = null
    }
    return Promise.reject(error);
  }
);

export default api;
