/** Module 004 Domain 2 event names, published via the shared `DomainEventPublisher`. */
export const RBAC_EVENTS = {
  ROLE_CREATED: "RoleCreated",
  ROLE_UPDATED: "RoleUpdated",
  ROLE_ASSIGNED: "RoleAssigned",
  PERMISSION_ASSIGNED: "PermissionAssigned",
} as const;
