import { Prisma } from "@rmsm/database";

/**
 * Milestone 2 fix — category 1 (JSON ↔ domain mapping) and category 3
 * (nullable JSON fields), centralized here rather than left as
 * scattered inline `as object` casts. Two real problems the original
 * mappers had:
 *
 * 1. `domainValue as object` is a bare TYPE ASSERTION — it tells the
 *    compiler "trust me," but does nothing to guarantee the value is
 *    actually JSON-safe (no `undefined` properties, no non-plain
 *    objects) the way Prisma's own `Prisma.InputJsonValue` requires.
 *    `toJsonInput` instead round-trips through `JSON.stringify`/
 *    `JSON.parse` — a real, structural guarantee, not just a compiler
 *    promise.
 * 2. A bare JavaScript `null` assigned to a nullable `Json?` column is
 *    a genuine Prisma type error, not just a style issue: Prisma
 *    distinguishes `Prisma.DbNull` (the SQL column is NULL) from
 *    `Prisma.JsonNull` (the column holds the JSON literal `null`) —
 *    a plain `null` is ambiguous between the two and Prisma's own
 *    generated input types reject it for `Json?` fields specifically
 *    (unlike ordinary nullable scalars, where plain `null` is correct
 *    and unchanged elsewhere in this module's own mappers).
 */
export function toJsonInput<T>(value: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

/** For a nullable Json? column: `Prisma.JsonNull` when there's genuinely no value, otherwise the real serialized value — never a bare `null`. */
export function toNullableJsonInput<T>(value: T | null | undefined): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (value === null || value === undefined) return Prisma.JsonNull;
  return toJsonInput(value);
}

/**
 * Read-side: Prisma's own `Prisma.JsonValue` is a wide union
 * (`string | number | boolean | JsonObject | JsonArray | null`) —
 * genuinely wider than any one domain shape read from one specific
 * column. A cast is still required going the other direction (Prisma
 * cannot know a `Json` column holds specifically an `Operand`, a
 * `ValidationFinding[]`, etc.) — centralized here as ONE named,
 * documented point of "trust the shape coming back," rather than
 * repeated ad hoc `as X` casts scattered across every mapper.
 */
export function fromJsonValue<T>(value: Prisma.JsonValue): T {
  return value as T;
}
