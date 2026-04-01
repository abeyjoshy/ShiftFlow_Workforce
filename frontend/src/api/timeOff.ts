import { apiClient } from './apiClient';
import type { ApiResponse, TimeOffRequest } from '../types';

export async function apiListTimeOff(params?: {
  status?: string;
  type?: string;
  page?: number;
  limit?: number;
}): Promise<ApiResponse<TimeOffRequest[]>> {
  const res = await apiClient.get<ApiResponse<TimeOffRequest[]>>('/time-off', { params });
  return res.data;
}

export async function apiCreateSickRequest(input: {
  startDate: string;
  endDate: string;
  note?: string;
}): Promise<ApiResponse<TimeOffRequest>> {
  const res = await apiClient.post<ApiResponse<TimeOffRequest>>('/time-off/sick', input);
  return res.data;
}

export async function apiCancelTimeOff(id: string): Promise<ApiResponse<TimeOffRequest>> {
  const res = await apiClient.put<ApiResponse<TimeOffRequest>>(`/time-off/${id}/cancel`);
  return res.data;
}

export async function apiApproveTimeOff(id: string, input?: { managerNote?: string }): Promise<ApiResponse<TimeOffRequest>> {
  const res = await apiClient.put<ApiResponse<TimeOffRequest>>(`/time-off/${id}/approve`, input ?? {});
  return res.data;
}

export async function apiRejectTimeOff(id: string, input?: { managerNote?: string }): Promise<ApiResponse<TimeOffRequest>> {
  const res = await apiClient.put<ApiResponse<TimeOffRequest>>(`/time-off/${id}/reject`, input ?? {});
  return res.data;
}

