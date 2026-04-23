/**
 * User Data Access Layer — fetches user info with role from FastAPI.
 */
import "server-only";

import { apiClient } from "@/lib/api-client";
import type { UserInfo } from "@/types/user";

export async function getCurrentUser(): Promise<UserInfo> {
  return apiClient.get<UserInfo>("/api/v1/user/me");
}

export async function updateCurrentUser(data: { name: string }): Promise<UserInfo> {
  return apiClient.patch<UserInfo>("/api/v1/user/me", data);
}

export async function updateCurrentUserPassword(data: {
  current_password: string;
  new_password: string;
}): Promise<void> {
  return apiClient.post("/api/v1/user/me/password", data);
}

export async function updateCurrentUserEmail(data: {
  new_email: string;
  password: string;
}): Promise<void> {
  return apiClient.post("/api/v1/user/me/email", data);
}

export async function deleteCurrentUser(): Promise<void> {
  return apiClient.delete("/api/v1/user/me");
}
