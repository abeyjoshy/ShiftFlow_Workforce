export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export function ok<T>(data: T, message?: string, pagination?: PaginationMeta): ApiResponse<T> {
  const payload: ApiResponse<T> = { success: true, data };
  if (message) payload.message = message;
  if (pagination) payload.pagination = pagination;
  return payload;
}

export function fail(message: string): ApiResponse<null> {
  return { success: false, data: null, message };
}

