import { apiClient } from './apiClient';
import type { ApiResponse } from '../types';

export interface EmployeeProfile {
  _id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  email: string;
  departmentId?: string;
  positionId?: string;
}

export async function apiEmployeeLogin(input: {
  email: string;
  password: string;
}): Promise<ApiResponse<{ token: string; employee: EmployeeProfile }>> {
  const res = await apiClient.post<ApiResponse<{ token: string; employee: EmployeeProfile }>>('/employee-auth/login', input);
  return res.data;
}

export async function apiEmployeeMe(): Promise<ApiResponse<EmployeeProfile>> {
  const res = await apiClient.get<ApiResponse<EmployeeProfile>>('/employee-auth/me');
  return res.data;
}

