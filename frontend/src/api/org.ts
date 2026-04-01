import { apiClient } from './apiClient';
import type { ApiResponse, Organization } from '../types';

export interface OrgStats {
  totalEmployees: number;
  shiftsThisWeek: number;
  openSwaps: number;
  hoursSummary: number;
}

export async function apiGetOrgStats(): Promise<ApiResponse<OrgStats>> {
  const res = await apiClient.get<ApiResponse<OrgStats>>('/org/stats');
  return res.data;
}

export async function apiGetOrg(): Promise<ApiResponse<Organization>> {
  const res = await apiClient.get<ApiResponse<Organization>>('/org');
  return res.data;
}

export async function apiUpdateOrg(input: {
  name?: string;
  settings?: Partial<Organization['settings']>;
}): Promise<ApiResponse<Organization>> {
  const res = await apiClient.put<ApiResponse<Organization>>('/org', input);
  return res.data;
}

