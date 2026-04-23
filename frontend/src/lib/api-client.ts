/**
 * Centralized API client for FastAPI.
 * Reads JWT from httpOnly cookies on the server side.
 * Uses /api/v1 prefix for all endpoints.
 */
import "server-only";

import { cookies } from "next/headers";
import { getServerEnv } from "@/lib/env";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ApiRequestInit extends RequestInit {
  /** Set true to bypass caching (mutations). */
  noCache?: boolean;
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(
  path: string,
  options: ApiRequestInit = {},
): Promise<T> {
  const { noCache, ...fetchOptions } = options;
  const { API_URL } = getServerEnv();
  const authHeaders = await getAuthHeaders();

  const res = await fetch(`${API_URL}${path}`, {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...fetchOptions.headers,
    },
    signal: AbortSignal.timeout(10_000),
    ...(noCache ? { cache: "no-store" as const } : {}),
  });

  if (!res.ok) {
    let message: string;
    try {
      const body = await res.json();
      message = body.detail ?? body.message ?? JSON.stringify(body);
    } catch {
      message = await res.text();
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T & undefined;
  return res.json();
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      noCache: true,
      body: body ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PATCH",
      noCache: true,
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: (path: string) =>
    request<void>(path, { method: "DELETE", noCache: true }),
};
