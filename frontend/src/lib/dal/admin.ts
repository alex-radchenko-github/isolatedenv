/**
 * Admin Data Access Layer — user management endpoints.
 */
import "server-only";

import { apiClient } from "@/lib/api-client";
import type { AdminUser, AdminUsersResponse, UserRole } from "@/types/user";

export interface ResetPasswordResponse {
  temporary_password: string;
}

export async function getAdminUsers(
  offset = 0,
  limit = 20,
  search?: string,
  role?: UserRole,
  isActive?: boolean,
): Promise<AdminUsersResponse> {
  const params = new URLSearchParams();
  params.set("offset", String(offset));
  params.set("limit", String(limit));
  if (search) params.set("search", search);
  if (role) params.set("role", role);
  if (isActive !== undefined) params.set("is_active", String(isActive));
  return apiClient.get<AdminUsersResponse>(`/api/v1/admin/users?${params}`);
}

export async function changeUserRole(
  userId: string,
  role: UserRole,
): Promise<AdminUser> {
  return apiClient.patch<AdminUser>(`/api/v1/admin/users/${encodeURIComponent(userId)}/role`, {
    role,
  });
}

export async function changeUserStatus(
  userId: string,
  isActive: boolean,
): Promise<AdminUser> {
  return apiClient.patch<AdminUser>(`/api/v1/admin/users/${encodeURIComponent(userId)}/block`, {
    is_active: isActive,
  });
}

export async function resetUserPassword(
  userId: string,
): Promise<ResetPasswordResponse> {
  return apiClient.post<ResetPasswordResponse>(
    `/api/v1/admin/users/${encodeURIComponent(userId)}/reset-password`,
  );
}

export async function deleteUser(userId: string): Promise<void> {
  return apiClient.delete(`/api/v1/admin/users/${encodeURIComponent(userId)}`);
}
