import { apiClient } from './apiClient';
import type { ApiResponse } from '../types';

export interface DepartmentDto {
  _id: string;
  name: string;
  organizationId: string;
  createdAt: string;
}

export interface PositionDto {
  _id: string;
  name: string;
  organizationId: string;
  departmentId: string;
  createdAt: string;
}

export async function apiGetOrgStructure(): Promise<
  ApiResponse<{ industry: string; departments: DepartmentDto[]; positions: PositionDto[] }>
> {
  const res = await apiClient.get<ApiResponse<{ industry: string; departments: DepartmentDto[]; positions: PositionDto[] }>>(
    '/org/structure',
  );
  return res.data;
}

