const USER = ["resource:view", "booking:create", "booking:view:own", "booking:cancel:own"] as const;

export const PERMISSIONS = {
  user: USER,
  admin: [
    ...USER,
    "booking:view:all",
    "booking:cancel:any",
    "booking:approve",
    "resource:manage",
    "resource-type:manage",
    "location:manage",
    "user:manage-roles",
    "settings:manage",
  ],
} as const;

/** Role that holds the admin permissions; only used for data queries (admin count, notifying admins). */
export const ADMIN_ROLE = "admin";

export type Permission = (typeof PERMISSIONS.admin)[number];
export type Actor = { id: string; name: string; email: string; role: string };

/** Every permission check goes through here; never compare role names directly. */
export function can(user: { role: string } | null | undefined, permission: Permission): boolean {
  if (!user) return false;
  const list = (PERMISSIONS as Record<string, readonly string[]>)[user.role];
  return !!list?.includes(permission);
}
