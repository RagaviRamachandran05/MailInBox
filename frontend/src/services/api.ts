import axios from 'axios';

const getBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    return envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`;
  }
  if (import.meta.env.PROD) {
    return 'https://mailinbox.onrender.com/api';
  }
  return '/api';
};

export const api = axios.create({
  baseURL: getBaseUrl(),
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
