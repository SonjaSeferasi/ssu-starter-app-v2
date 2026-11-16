'use client';
import { storedAccessToken } from '../../lib/account/session';

// Authenticated, uncached DormSpace requests. Status 0 means the outcome is unknown (network loss).
export type ApiResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: string; code?: string; body: Record<string, unknown> };

export async function dormRequest<T>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  try {
    const response = await fetch(path, {
      ...init, cache: 'no-store',
      headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), Authorization: `Bearer ${storedAccessToken() ?? ''}`, ...init.headers },
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) return { ok: true, status: response.status, data: data as T };
    return { ok: false, status: response.status, error: typeof data.error === 'string' ? data.error : 'Something went wrong. Please try again.', code: typeof data.code === 'string' ? data.code : undefined, body: data };
  } catch {
    return { ok: false, status: 0, error: 'You appear to be offline. Check your connection and try again.', body: {} };
  }
}
