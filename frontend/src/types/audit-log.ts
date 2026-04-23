export type AuditAction =
  | "change_role"
  | "block_user"
  | "unblock_user"
  | "delete_user"
  | "reset_password";

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  admin_user_id: string;
  admin_email: string;
  action: AuditAction;
  target_user_id: string;
  target_user_email: string;
  details: Record<string, string> | null;
  ip_address: string | null;
}

export interface AuditLogResponse {
  entries: AuditLogEntry[];
  total: number;
  offset: number;
  limit: number;
}

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  change_role: "Change Role",
  block_user: "Block User",
  unblock_user: "Unblock User",
  delete_user: "Delete User",
  reset_password: "Reset Password",
};
