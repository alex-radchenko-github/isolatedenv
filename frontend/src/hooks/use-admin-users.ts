"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import {
  adminDeleteUser,
  fetchAdminUsers,
  updateUserRole,
  updateUserStatus,
  adminResetPassword,
} from "@/actions/admin";
import type { AdminUsersResponse, UserRole } from "@/types/user";

export function useAdminUsers(offset = 0, limit = 20, search?: string) {
  return useQuery({
    queryKey: ["adminUsers", offset, limit, search],
    queryFn: () => fetchAdminUsers(offset, limit, search),
    staleTime: 30_000,
  });
}

export function useChangeUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) =>
      updateUserRole(userId, role),
    onMutate: async ({ userId, role }) => {
      await qc.cancelQueries({ queryKey: ["adminUsers"] });
      const previous = qc.getQueriesData<AdminUsersResponse>({ queryKey: ["adminUsers"] });
      qc.setQueriesData<AdminUsersResponse>({ queryKey: ["adminUsers"] }, (old) => {
        if (!old?.users) return old;
        return {
          ...old,
          users: old.users.map((u) =>
            u.id === userId ? { ...u, role } : u
          ),
        };
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        context.previous.forEach(([key, data]) => qc.setQueryData(key, data));
      }
      notifications.show({ message: "Failed to change role", color: "red" });
    },
    onSuccess: () => {
      notifications.show({ message: "Role updated successfully", color: "green" });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["adminUsers"] });
    },
  });
}

export function useChangeUserStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      isActive,
    }: {
      userId: string;
      isActive: boolean;
    }) => updateUserStatus(userId, isActive),
    onMutate: async ({ userId, isActive }) => {
      await qc.cancelQueries({ queryKey: ["adminUsers"] });
      const previous = qc.getQueriesData<AdminUsersResponse>({ queryKey: ["adminUsers"] });
      qc.setQueriesData<AdminUsersResponse>({ queryKey: ["adminUsers"] }, (old) => {
        if (!old?.users) return old;
        return {
          ...old,
          users: old.users.map((u) =>
            u.id === userId ? { ...u, is_active: isActive } : u
          ),
        };
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        context.previous.forEach(([key, data]) => qc.setQueryData(key, data));
      }
      notifications.show({ message: "Failed to update user status", color: "red" });
    },
    onSuccess: (_data, { isActive }) => {
      notifications.show({ message: isActive ? "User unblocked" : "User blocked", color: "green" });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["adminUsers"] });
    },
  });
}

export function useResetUserPassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => adminResetPassword(userId),
    onError: () => {
      notifications.show({ message: "Failed to reset password", color: "red" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminUsers"] });
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => adminDeleteUser(userId),
    onMutate: async (userId) => {
      await qc.cancelQueries({ queryKey: ["adminUsers"] });
      const previous = qc.getQueriesData<AdminUsersResponse>({ queryKey: ["adminUsers"] });
      qc.setQueriesData<AdminUsersResponse>({ queryKey: ["adminUsers"] }, (old) => {
        if (!old?.users) return old;
        return {
          ...old,
          total: old.total - 1,
          users: old.users.filter((u) => u.id !== userId),
        };
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        context.previous.forEach(([key, data]) => qc.setQueryData(key, data));
      }
      notifications.show({ message: "Failed to delete user", color: "red" });
    },
    onSuccess: () => {
      notifications.show({ message: "User deleted", color: "green" });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["adminUsers"] });
    },
  });
}
