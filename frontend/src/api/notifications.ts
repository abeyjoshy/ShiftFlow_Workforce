import { apiClient } from './apiClient';
import type { ApiResponse, Notification } from '../types';

export async function apiListNotifications(params?: {
  page?: number;
  limit?: number;
}): Promise<ApiResponse<Notification[]>> {
  const res = await apiClient.get<ApiResponse<Notification[]>>('/notifications', { params });
  return res.data;
}

export async function apiUnreadCount(): Promise<ApiResponse<{ count: number }>> {
  const res = await apiClient.get<ApiResponse<{ count: number }>>('/notifications/unread-count');
  return res.data;
}

export async function apiMarkAllRead(): Promise<ApiResponse<Record<string, never>>> {
  const res = await apiClient.put<ApiResponse<Record<string, never>>>('/notifications/read-all');
  return res.data;
}

export async function apiMarkRead(id: string): Promise<ApiResponse<Notification>> {
  const res = await apiClient.put<ApiResponse<Notification>>(`/notifications/${id}/read`);
  return res.data;
}

export async function apiDeleteNotification(id: string): Promise<ApiResponse<Record<string, never>>> {
  const res = await apiClient.delete<ApiResponse<Record<string, never>>>(`/notifications/${id}`);
  return res.data;
}

