/**
 * Example Data Access Layer functions.
 *
 * Note: "use cache" cannot be used here because apiClient reads cookies()
 * for auth headers, and cookies() is a dynamic data source incompatible
 * with "use cache". Caching is handled by TanStack Query on the client.
 */
import "server-only";

import { apiClient } from "@/lib/api-client";

export interface Item {
  id: string;
  title: string;
  description: string | null;
}

export async function getItems(offset = 0, limit = 20): Promise<Item[]> {
  const params = new URLSearchParams({
    offset: String(offset),
    limit: String(limit),
  });
  return apiClient.get(`/api/v1/items?${params}`);
}

export async function getItem(id: string): Promise<Item> {
  return apiClient.get(`/api/v1/items/${encodeURIComponent(id)}`);
}

export async function createItem(data: { title: string; description?: string }): Promise<Item> {
  return apiClient.post("/api/v1/items", data);
}

export async function updateItem(id: string, data: { title?: string; description?: string }): Promise<Item> {
  return apiClient.patch(`/api/v1/items/${encodeURIComponent(id)}`, data);
}

export async function deleteItem(id: string): Promise<void> {
  return apiClient.delete(`/api/v1/items/${encodeURIComponent(id)}`);
}
