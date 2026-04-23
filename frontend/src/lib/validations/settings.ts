/**
 * Zod schemas for settings forms.
 */
import { z } from "zod";

export const profileSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

export type ProfileValues = z.infer<typeof profileSchema>;

export const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type PasswordValues = z.infer<typeof passwordSchema>;

export const emailChangeSchema = z.object({
  newEmail: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required for verification"),
});

export type EmailChangeValues = z.infer<typeof emailChangeSchema>;

export const deleteAccountSchema = z.object({
  confirmation: z.literal("DELETE", {
    message: 'Type "DELETE" to confirm',
  }),
});

export type DeleteAccountValues = z.infer<typeof deleteAccountSchema>;
