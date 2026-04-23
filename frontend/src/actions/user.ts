"use server";

import { z } from "zod";
import {
  getCurrentUser,
  updateCurrentUser,
  updateCurrentUserPassword,
  updateCurrentUserEmail,
  deleteCurrentUser,
} from "@/lib/dal/user";
import { withAuth } from "@/lib/action-utils";
import { revalidatePath } from "next/cache";
import type { UserInfo } from "@/types/user";

const profileSchema = z.object({
  name: z.string().min(1).max(200),
});

const passwordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(8).max(128),
});

const emailSchema = z.object({
  new_email: z.string().email(),
  password: z.string().min(1),
});

export async function fetchCurrentUser(): Promise<UserInfo> {
  return withAuth(() => getCurrentUser());
}

export async function updateProfile(data: { name: string }): Promise<UserInfo> {
  const input = profileSchema.parse(data);
  return withAuth(async () => {
    const user = await updateCurrentUser(input);
    revalidatePath("/dashboard");
    return user;
  });
}

export async function updatePassword(data: {
  current_password: string;
  new_password: string;
}): Promise<void> {
  const input = passwordSchema.parse(data);
  return withAuth(() => updateCurrentUserPassword(input));
}

export async function updateEmail(data: {
  new_email: string;
  password: string;
}): Promise<void> {
  const input = emailSchema.parse(data);
  return withAuth(async () => {
    await updateCurrentUserEmail(input);
    revalidatePath("/dashboard");
  });
}

export async function deleteMyAccount(): Promise<void> {
  return withAuth(() => deleteCurrentUser());
}
