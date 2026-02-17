// src/types/api.ts
// Consistent API response types for all v1 endpoints.

export type ApiResponse<T = unknown> = {
  data: T | null;
  error: string | null;
  status: number;
};

export type PaginatedResponse<T = unknown> = ApiResponse<{
  items: T[];
  total: number;
  page: number;
  per_page: number;
}>;

/** Standard success helpers */
export function ok<T>(data: T, status = 200): ApiResponse<T> {
  return { data, error: null, status };
}

export function created<T>(data: T): ApiResponse<T> {
  return { data, error: null, status: 201 };
}

/** Standard error helpers */
export function badRequest(msg: string): ApiResponse<null> {
  return { data: null, error: msg, status: 400 };
}

export function unauthorized(msg = "Not authenticated"): ApiResponse<null> {
  return { data: null, error: msg, status: 401 };
}

export function forbidden(msg = "Insufficient permissions"): ApiResponse<null> {
  return { data: null, error: msg, status: 403 };
}

export function notFound(msg = "Not found"): ApiResponse<null> {
  return { data: null, error: msg, status: 404 };
}

export function serverError(msg = "Internal server error"): ApiResponse<null> {
  return { data: null, error: msg, status: 500 };
}
