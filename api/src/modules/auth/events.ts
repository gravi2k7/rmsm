/**
 * Module 004 — shared event-name constants for session/password lifecycle
 * events published via the generic `DomainEventPublisher`
 * (`api/src/common/events/`). Kept alongside `AuthService`/`SessionService`
 * since those are the only publishers of these three events (mirrors
 * `api/src/modules/users/events.ts` and `api/src/modules/rbac/events.ts`).
 */
export const AUTH_EVENTS = {
  SESSION_CREATED: "SessionCreated",
  SESSION_REVOKED: "SessionRevoked",
  PASSWORD_RESET: "PasswordReset",
} as const;
