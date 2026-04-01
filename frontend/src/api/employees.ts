import { apiClient } from './apiClient';
import type { ApiResponse, AvailabilityBlock, Employee, Shift } from '../types';

export async function apiListEmployees(params?: {
  departmentId?: string;
  positionId?: string;
  status?: 'active' | 'inactive';
  page?: number;
  limit?: number;
}): Promise<ApiResponse<Employee[]>> {
  const res = await apiClient.get<ApiResponse<Employee[]>>('/employees', { params });
  return res.data;
}

export async function apiCreateEmployee(input: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  departmentId: string;
  positionId: string;
  employmentType: 'full-time' | 'part-time' | 'casual';
  canLogin?: boolean;
  password?: string;
  hourlyRate?: number;
  weeklyHours?: number;
  hireDate?: string;
}): Promise<ApiResponse<Employee>> {
  const res = await apiClient.post<ApiResponse<Employee>>('/employees', input);
  return res.data;
}

export async function apiGetEmployee(id: string): Promise<ApiResponse<Employee>> {
  const res = await apiClient.get<ApiResponse<Employee>>(`/employees/${id}`);
  return res.data;
}

export async function apiUpdateEmployee(
  id: string,
  patch: Partial<Omit<Employee, '_id' | 'organizationId' | 'createdAt'>>,
): Promise<ApiResponse<Employee>> {
  const res = await apiClient.put<ApiResponse<Employee>>(`/employees/${id}`, patch);
  return res.data;
}

export async function apiDeactivateEmployee(id: string): Promise<ApiResponse<Employee>> {
  const res = await apiClient.delete<ApiResponse<Employee>>(`/employees/${id}`);
  return res.data;
}

export async function apiUpdateAvailability(
  id: string,
  availability: AvailabilityBlock[],
): Promise<ApiResponse<Employee>> {
  const res = await apiClient.put<ApiResponse<Employee>>(`/employees/${id}/availability`, { availability });
  return res.data;
}

export async function apiGetEmployeeShifts(params: {
  id: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<ApiResponse<Shift[]>> {
  const { id, ...rest } = params;
  const res = await apiClient.get<ApiResponse<Shift[]>>(`/employees/${id}/shifts`, { params: rest });
  return res.data;
}

