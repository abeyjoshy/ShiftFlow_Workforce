import { apiClient } from './apiClient';
import type { ApiResponse, Shift } from '../types';

export interface OnShiftItem {
  shift: Shift & { employeeId: any };
  isScheduledNow: boolean;
  isClockedIn: boolean;
  isClockedOut: boolean;
}

export async function apiOnShiftNow(): Promise<ApiResponse<{ now: string; items: OnShiftItem[] }>> {
  const res = await apiClient.get<ApiResponse<{ now: string; items: OnShiftItem[] }>>('/monitoring/on-shift');
  return res.data;
}

