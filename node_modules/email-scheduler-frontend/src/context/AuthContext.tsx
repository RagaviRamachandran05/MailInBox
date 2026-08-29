import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  googleClientId: string;
  loginWithGoogle: () => void;
  loginWithGoogleCredential: (credential: string) => Promise<void>;
  loginWithPassword: (email: string, password?: string, name?: string) => Promise<void>;
  loginWithDev: (email?: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [googleClientId, setGoogleClientId] = useState<string>('');

  const fetchCurrentUser = async () => {
    try {
      const [userRes, configRes] = await Promise.allSettled([
        api.get('/auth/me'),
        api.get('/auth/config'),
      ]);

      if (userRes.status === 'fulfilled' && userRes.value.data.success && userRes.value.data.user) {
        setUser(userRes.value.data.user);
      } else {
        setUser(null);
      }

      if (configRes.status === 'fulfilled' && configRes.value.data.googleClientId) {
        setGoogleClientId(configRes.value.data.googleClientId);
      }
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check if redirected from Google OAuth with token
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
      localStorage.setItem('auramail_token', token);
      // Clean query parameter from URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    fetchCurrentUser();
  }, []);

  const loginWithGoogle = () => {
    window.location.href = '/api/auth/google';
  };

  const loginWithGoogleCredential = async (credential: string) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/google/credential', { credential });
      if (res.data.success && res.data.token) {
        localStorage.setItem('auramail_token', res.data.token);
        setUser(res.data.user);
      }
    } finally {
      setLoading(false);
    }
  };

  const loginWithPassword = async (email: string, password?: string, name?: string) => {
    setLoading(true);
    try {
      let res;
      try {
        res = await api.post('/auth/login', { email, password, name });
      } catch (err: any) {
        if (err.response?.status === 404) {
          res = await api.post('/auth/dev-login', { email, name });
        } else {
          throw err;
        }
      }
      if (res.data.success && res.data.token) {
        localStorage.setItem('auramail_token', res.data.token);
        setUser(res.data.user);
      }
    } finally {
      setLoading(false);
    }
  };

  const loginWithDev = async (email?: string, name?: string) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/dev-login', { email, name });
      if (res.data.success && res.data.token) {
        localStorage.setItem('auramail_token', res.data.token);
        setUser(res.data.user);
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // Ignore logout request error
    } finally {
      localStorage.removeItem('auramail_token');
      setUser(null);
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        googleClientId,
        loginWithGoogle,
        loginWithGoogleCredential,
        loginWithPassword,
        loginWithDev,
        logout,
        refreshUser: fetchCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
