import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';

import { apiLogin, apiMe } from '../api/auth';
import { clearStoredToken, getStoredToken, storeToken } from '../api/apiClient';
import type { User } from '../types';
import { useNavigate } from 'react-router-dom';



export interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (patch: Partial<User>) => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const bootstrap = useCallback(async () => {
    // Dev-only: set REACT_APP_CLEAR_AUTH_ON_BOOT=true in client .env to always show login (no remembered session).
    if (process.env.REACT_APP_CLEAR_AUTH_ON_BOOT === 'true') {
      clearStoredToken();
    }
    const stored = getStoredToken();
    if (!stored) {
      setToken(null);
      setUser(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      setToken(stored);
      const me = await apiMe();
      if (me.success) {
        setUser(me.data);
      } else {
        clearStoredToken();
        setToken(null);
        setUser(null);
      }
    } catch {
      clearStoredToken();
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await apiLogin({ email, password });
      if (!res.success) throw new Error(res.message ?? 'Login failed');
      storeToken(res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const navigate = useNavigate();

  const logout = useCallback(() => {
    clearStoredToken();
    setToken(null);
    setUser(null);
    //window.location.assign('/login');
    navigate('/login', { replace: true });
  }, []);

  const updateUser = useCallback((patch: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, isLoading, login, logout, updateUser }),
    [user, token, isLoading, login, logout, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

