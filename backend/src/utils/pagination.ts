import type { PaginationMeta } from './api';

export interface PaginationInput {
  page: number;
  limit: number;
  skip: number;
}

export function parsePagination(query: Record<string, unknown>): PaginationInput {
  const pageRaw = typeof query.page === 'string' ? query.page : undefined;
  const limitRaw = typeof query.limit === 'string' ? query.limit : undefined;

  const page = Math.max(1, Number(pageRaw ?? '1') || 1);
  const limit = Math.min(100, Math.max(1, Number(limitRaw ?? '20') || 20));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

export function buildPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
  const pages = Math.max(1, Math.ceil(total / limit));
  return { page, limit, total, pages };
}

