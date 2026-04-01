import { apiClient } from './apiClient';
import type { ApiResponse, Employee, Shift } from '../types';

export async function apiListShifts(params?: {
  employeeId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  department?: string;
  page?: number;
  limit?: number;
}): Promise<ApiResponse<Shift[]>> {
  const res = await apiClient.get<ApiResponse<Shift[]>>('/shifts', { params });
  return res.data;
}

export interface WeekScheduleData {
  employees: Employee[];
  shifts: Shift[];
  weekDays: string[];
}

export async function apiGetWeekSchedule(params: { weekStart: string }): Promise<ApiResponse<WeekScheduleData>> {
  const res = await apiClient.get<ApiResponse<WeekScheduleData>>('/shifts/schedule/week', { params });
  return res.data;
}

export async function apiPublishWeek(input: { weekStart: string }): Promise<ApiResponse<{ published: number }>> {
  const res = await apiClient.post<ApiResponse<{ published: number }>>('/shifts/publish-week', input);
  return res.data;
}

export async function apiCreateShift(input: {
  employeeId: string;
  date: string;
  startTime: string;
  endTime: string;
  position: string;
  location?: string;
  status?: string;
  notes?: string;
}): Promise<ApiResponse<Shift>> {
  const res = await apiClient.post<ApiResponse<Shift>>('/shifts', input);
  return res.data;
}

export async function apiUpdateShift(
  id: string,
  patch: Partial<Pick<Shift, 'employeeId' | 'date' | 'startTime' | 'endTime' | 'position' | 'location' | 'status' | 'notes'>>,
): Promise<ApiResponse<Shift>> {
  const res = await apiClient.put<ApiResponse<Shift>>(`/shifts/${id}`, patch);
  return res.data;
}

export async function apiClockIn(shiftId: string): Promise<ApiResponse<Shift>> {
  const res = await apiClient.put<ApiResponse<Shift>>(`/shifts/${shiftId}/clock-in`);
  return res.data;
}

export async function apiClockOut(shiftId: string): Promise<ApiResponse<Shift>> {
  const res = await apiClient.put<ApiResponse<Shift>>(`/shifts/${shiftId}/clock-out`);
  return res.data;
}

export async function apiDeleteShift(id: string): Promise<ApiResponse<{}>> {
  const res = await apiClient.delete<ApiResponse<{}>>(`/shifts/${id}`);
  return res.data;
}

