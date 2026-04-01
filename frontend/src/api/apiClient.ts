import axios, { type AxiosError } from 'axios';

const ADMIN_TOKEN_KEY = 'shift_app_token';
const EMPLOYEE_TOKEN_KEY = 'shift_app_employee_token';

type ErrorResponseShape = {
  message?: string;
  errors?: Array<{ msg?: string; message?: string }>;
};

function isEmployeePath(pathname: string): boolean {
  return pathname === '/employee-login' || pathname === '/employee-dashboard' || pathname.startsWith('/employee/');
}

export const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
});

apiClient.interceptors.request.use((config) => {
  const isEmployeeRoute = isEmployeePath(window.location.pathname);
  const token = localStorage.getItem(isEmployeeRoute ? EMPLOYEE_TOKEN_KEY : ADMIN_TOKEN_KEY);
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const data = error.response?.data as ErrorResponseShape | undefined;
    const serverMessage =
      data?.message ??
      data?.errors?.[0]?.msg ??
      data?.errors?.[0]?.message ??
      undefined;

    if (error.response?.status === 401) {
      const isEmployeeRoute = isEmployeePath(window.location.pathname);
      localStorage.removeItem(isEmployeeRoute ? EMPLOYEE_TOKEN_KEY : ADMIN_TOKEN_KEY);
      const target = isEmployeeRoute ? '/employee-login' : '/login';
      if (window.location.pathname !== target) window.location.assign(target);
    }
    if (serverMessage) {
      return Promise.reject(new Error(serverMessage));
    }
    return Promise.reject(error);
  },
);

export function getStoredToken(): string | null {
  const isEmployeeRoute = isEmployeePath(window.location.pathname);
  return localStorage.getItem(isEmployeeRoute ? EMPLOYEE_TOKEN_KEY : ADMIN_TOKEN_KEY);
}

export function storeToken(token: string): void {
  const isEmployeeRoute = isEmployeePath(window.location.pathname);
  localStorage.setItem(isEmployeeRoute ? EMPLOYEE_TOKEN_KEY : ADMIN_TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(EMPLOYEE_TOKEN_KEY);
}

