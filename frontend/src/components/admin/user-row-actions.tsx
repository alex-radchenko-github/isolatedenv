"use client";

import { useState } from "react";
import { IconDots, IconShield, IconBan, IconKey, IconTrash } from "@tabler/icons-react";
import { ActionIcon, Menu } from "@mantine/core";
import { ChangeRoleDialog } from "@/components/admin/change-role-dialog";
import { BlockUserDialog } from "@/components/admin/block-user-dialog";
import { ResetPasswordDialog } from "@/components/admin/reset-password-dialog";
import { DeleteUserDialog } from "@/components/admin/delete-user-dialog";
import type { AdminUser } from "@/types/user";

interface UserRowActionsProps {
  user: AdminUser;
}

export function UserRowActions({ user }: UserRowActionsProps) {
  const [roleOpen, setRoleOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <Menu shadow="md" position="bottom-end">
        <Menu.Target>
          <ActionIcon variant="subtle" aria-label="User actions">
            <IconDots size={16} stroke={1.5} />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item
            leftSection={<IconShield size={14} stroke={1.5} />}
            onClick={() => setRoleOpen(true)}
          >
            Change Role
          </Menu.Item>
          <Menu.Item
            leftSection={<IconBan size={14} stroke={1.5} />}
            onClick={() => setBlockOpen(true)}
          >
            {user.is_active ? "Block User" : "Unblock User"}
          </Menu.Item>
          <Menu.Divider />
          <Menu.Item
            leftSection={<IconKey size={14} stroke={1.5} />}
            onClick={() => setResetOpen(true)}
          >
            Reset Password
          </Menu.Item>
          <Menu.Divider />
          <Menu.Item
            color="red"
            leftSection={<IconTrash size={14} stroke={1.5} />}
            onClick={() => setDeleteOpen(true)}
          >
            Delete User
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

      {/* key forces remount when user changes, preventing stale role state */}
      <ChangeRoleDialog key={user.id} user={user} open={roleOpen} onOpenChange={setRoleOpen} />
      <BlockUserDialog user={user} open={blockOpen} onOpenChange={setBlockOpen} />
      <ResetPasswordDialog user={user} open={resetOpen} onOpenChange={setResetOpen} />
      <DeleteUserDialog user={user} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </>
  );
}
