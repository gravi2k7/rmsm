export interface Permission {
  id: string;
  key: string;
  description?: string;
  group: string;
  createdAt: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  parentRoleId?: string | null;
  createdAt: string;
}

export interface RoleWithPermissions extends Role {
  rolePermissions: { permission: Permission }[];
}
