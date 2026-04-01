import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';

import { apiEmployeeLogin, apiEmployeeMe, type EmployeeProfile } from '../api/employeeAuth';

import { useNavigate } from 'react-router-dom';



const EMPLOYEE_TOKEN_KEY = 'shift_app_employee_token';

function getEmployeeToken(): string | null {
  return localStorage.getItem(EMPLOYEE_TOKEN_KEY);
}

function storeEmployeeToken(token: string): void {
  localStorage.setItem(EMPLOYEE_TOKEN_KEY, token);
}

function clearEmployeeToken(): void {
  localStorage.removeItem(EMPLOYEE_TOKEN_KEY);
}

export interface EmployeeAuthContextValue {
  employee: EmployeeProfile | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const EmployeeAuthContext = createContext<EmployeeAuthContextValue | undefined>(undefined);

export function EmployeeAuthProvider({ children }: { children: React.ReactNode }) {
  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [token, setToken] = useState<string | null>(getEmployeeToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const bootstrap = useCallback(async () => {
    const stored = getEmployeeToken();
    if (!stored) {
      setToken(null);
      setEmployee(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      setToken(stored);
      const me = await apiEmployeeMe();
      if (me.success) {
        setEmployee(me.data);
      } else {
        clearEmployeeToken();
        setToken(null);
        setEmployee(null);
      }
    } catch {
      clearEmployeeToken();
      setToken(null);
      setEmployee(null);
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
      const res = await apiEmployeeLogin({ email, password });
      if (!res.success) throw new Error(res.message ?? 'Login failed');
      storeEmployeeToken(res.data.token);
      setToken(res.data.token);
      setEmployee(res.data.employee);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const navigate = useNavigate();

  const logout = useCallback(() => {
    clearEmployeeToken();
    setToken(null);
    setEmployee(null);
    // window.location.assign('/employee-login');
    navigate('/employee-login', { replace: true });
  }, [navigate]);

  const value = useMemo<EmployeeAuthContextValue>(
    () => ({ employee, token, isLoading, login, logout }),
    [employee, token, isLoading, login, logout],
  );

  return <EmployeeAuthContext.Provider value={value}>{children}</EmployeeAuthContext.Provider>;
}

