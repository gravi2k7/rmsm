/** Module 004 Domain 1 event names, published via the shared `DomainEventPublisher`. */
export const USER_EVENTS = {
  CREATED: "UserCreated",
  UPDATED: "UserUpdated",
  DELETED: "UserDeleted",
  RESTORED: "UserRestored",
  SUSPENDED: "UserSuspended",
  ACTIVATED: "UserActivated",
  INVITED: "UserInvited",
} as const;
