/**
 * Converts an arbitrary object into a JSON-safe value.
 *
 * `Record<string, unknown>` (and any plain object without an index
 * signature) is not structurally assignable to Prisma's `InputJsonValue`
 * — this exact helper has now been hand-copied into 5 separate files
 * across Modules 003/004 (AuditService, OrganizationMembershipEventRepository,
 * OrganizationRepository, BillingAccountRepository, PaymentWebhookRepository)
 * before finally being extracted here. Module 005's explicit "no
 * duplicated code" standard is the reason to stop copying it a 6th time.
 *
 * `JsonSafeValue` is declared locally, not imported from `@rmsm/database`
 * — `@rmsm/shared` is meant to be usable by the frontend apps too
 * (`apps/web`, `apps/admin`), so it deliberately never depends on
 * `@prisma/client`. `JsonSafeValue` is structurally identical to Prisma's
 * `InputJsonValue` (same recursive union shape), so TypeScript's
 * structural typing accepts this return value at any Prisma `Json` field
 * assignment without an explicit cast at the call site — two
 * independently-declared types with matching structure are assignable to
 * each other regardless of name.
 *
 * A bare `as Prisma.InputJsonValue` cast would silence the type error
 * without guaranteeing it's actually true at runtime. Round-tripping
 * through `JSON.stringify`/`JSON.parse` does the same coercion a
 * Postgres `jsonb` column would, so this is backed by a real runtime
 * guarantee, not just an asserted-away type error.
 *
 * Typed as `object`, not `Record<string, unknown>` — a named interface
 * without an index signature (e.g. a DTO class) isn't assignable to
 * `Record<string, unknown>` even though it's a perfectly ordinary object
 * (found and fixed once already, in Module 004's `BillingAccountRepository`).
 */
export type JsonSafeValue = string | number | boolean | { [key: string]: JsonSafeValue } | JsonSafeValue[];

export function toInputJsonValue(value: object): JsonSafeValue {
  return JSON.parse(JSON.stringify(value)) as JsonSafeValue;
}
