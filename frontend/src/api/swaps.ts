import { apiClient } from './apiClient';
import type { ApiResponse, SwapRequest } from '../types';

export async function apiListSwaps(params?: {
  status?: string;
  targetStatus?: string;
  page?: number;
  limit?: number;
}): Promise<ApiResponse<SwapRequest[]>> {
  const res = await apiClient.get<ApiResponse<SwapRequest[]>>('/swaps', { params });
  return res.data;
}

export async function apiCreateSwap(input: {
  requestedShiftId: string;
  targetEmployeeId: string;
  offeredShiftId?: string;
  requesterNote?: string;
}): Promise<ApiResponse<SwapRequest>> {
  const res = await apiClient.post<ApiResponse<SwapRequest>>('/swaps', input);
  return res.data;
}

export async function apiApproveSwap(id: string, input?: { managerNote?: string }): Promise<ApiResponse<SwapRequest>> {
  const res = await apiClient.put<ApiResponse<SwapRequest>>(`/swaps/${id}/approve`, input ?? {});
  return res.data;
}

export async function apiRejectSwap(id: string, input?: { managerNote?: string }): Promise<ApiResponse<SwapRequest>> {
  const res = await apiClient.put<ApiResponse<SwapRequest>>(`/swaps/${id}/reject`, input ?? {});
  return res.data;
}

export async function apiCancelSwap(id: string): Promise<ApiResponse<SwapRequest>> {
  const res = await apiClient.put<ApiResponse<SwapRequest>>(`/swaps/${id}/cancel`);
  return res.data;
}

export async function apiAcceptSwap(id: string): Promise<ApiResponse<SwapRequest>> {
  const res = await apiClient.put<ApiResponse<SwapRequest>>(`/swaps/${id}/accept`);
  return res.data;
}

export async function apiDeclineSwap(id: string): Promise<ApiResponse<SwapRequest>> {
  const res = await apiClient.put<ApiResponse<SwapRequest>>(`/swaps/${id}/decline`);
  return res.data;
}

