import axios from 'axios';

const apiBase = import.meta.env.VITE_API_URL 
  ? (import.meta.env.VITE_API_URL.endsWith('/api') ? import.meta.env.VITE_API_URL : `${import.meta.env.VITE_API_URL}/api`)
  : '/api';

export const api = axios.create({
  baseURL: apiBase,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach stored token if available (for cross-origin/dev fallback)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auramail_token');
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercept 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('auramail_token');
      // Let AuthContext handle state without abrupt reload
    }
    return Promise.reject(error);
  }
);
