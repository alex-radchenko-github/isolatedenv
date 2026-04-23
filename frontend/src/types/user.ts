export type UserRole = "free" | "paid" | "admin";

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface AdminUser extends UserInfo {
  provider_id: string;
  updated_at: string;
}

export interface AdminUsersResponse {
  users: AdminUser[];
  total: number;
  offset: number;
  limit: number;
}
