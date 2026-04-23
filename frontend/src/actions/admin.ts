"use server";

import { z } from "zod";
import {
  changeUserRole,
  changeUserStatus,
  deleteUser,
  getAdminUsers,
  resetUserPassword,
  type ResetPasswordResponse,
} from "@/lib/dal/admin";
import { withAuth } from "@/lib/action-utils";
import type { AdminUser, AdminUsersResponse, UserRole } from "@/types/user";

const paginationSchema = z.object({
  offset: z.number().int().min(0).default(0),
  limit: z.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
});

const updateRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["free", "paid", "admin"]),
});

const updateStatusSchema = z.object({
  userId: z.string().uuid(),
  isActive: z.boolean(),
});

const userIdSchema = z.string().uuid();

export async function fetchAdminUsers(
  offset = 0,
  limit = 20,
  search?: string,
): Promise<AdminUsersResponse> {
  const input = paginationSchema.parse({ offset, limit, search });
  return withAuth(() => getAdminUsers(input.offset, input.limit, input.search));
}

export async function updateUserRole(
  userId: string,
  role: UserRole,
): Promise<AdminUser> {
  const input = updateRoleSchema.parse({ userId, role });
  return withAuth(() => changeUserRole(input.userId, input.role));
}

export async function updateUserStatus(
  userId: string,
  isActive: boolean,
): Promise<AdminUser> {
  const input = updateStatusSchema.parse({ userId, isActive });
  return withAuth(() => changeUserStatus(input.userId, input.isActive));
}

export async function adminResetPassword(
  userId: string,
): Promise<ResetPasswordResponse> {
  const input = userIdSchema.parse(userId);
  return withAuth(() => resetUserPassword(input));
}

export async function adminDeleteUser(userId: string): Promise<void> {
  const input = userIdSchema.parse(userId);
  return withAuth(() => deleteUser(input));
}
