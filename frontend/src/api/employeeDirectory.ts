import { apiClient } from './apiClient';
import type { ApiResponse, Employee } from '../types';

export type EmployeeDirectoryItem = Pick<Employee, '_id' | 'firstName' | 'lastName' | 'email' | 'departmentId' | 'positionId'>;

export async function apiEmployeeDirectory(): Promise<ApiResponse<EmployeeDirectoryItem[]>> {
  const res = await apiClient.get<ApiResponse<EmployeeDirectoryItem[]>>('/employees/directory');
  return res.data;
}

