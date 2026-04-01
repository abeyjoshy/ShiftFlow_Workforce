import { apiClient } from './apiClient';

import type { ApiResponse, User } from '../types';

export async function apiRegister(input: {
  orgName: string;
  industry: 'Restaurant' | 'Retail' | 'Healthcare' | 'Corporate Office' | 'Warehouse / Logistics';
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}): Promise<ApiResponse<{ token: string; user: User }>> {
  const res = await apiClient.post<ApiResponse<{ token: string; user: User }>>('/auth/register', input);
  return res.data;
}

export async function apiLogin(input: {
  email: string;
  password: string;
}): Promise<ApiResponse<{ token: string; user: User }>> {
  const res = await apiClient.post<ApiResponse<{ token: string; user: User }>>('/auth/login', input);
  return res.data;
}

export async function apiMe(): Promise<ApiResponse<User>> {
  const res = await apiClient.get<ApiResponse<User>>('/auth/me');
  return res.data;
}

export async function apiChangePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<ApiResponse<Record<string, never>>> {
  const res = await apiClient.put<ApiResponse<Record<string, never>>>('/auth/change-password', input);
  return res.data;
}

