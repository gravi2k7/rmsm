/**
 * A small, fluent builder for assembling a Prisma `where` clause from
 * conditionally-present filter values — the common "only add this
 * condition if the caller actually supplied a value" pattern every
 * search/list method otherwise hand-rolls with a chain of `if` statements
 * mutating a `where` object. Generic over the target `where` shape
 * (`TWhere`, e.g. `Prisma.StrategyWhereInput`), so it stays type-safe
 * without this package needing to know about any specific model's filter
 * shape.
 */
export class FilterBuilder<TWhere extends Record<string, unknown>> {
  private readonly conditions: Partial<TWhere> = {};

  /** Sets `field` to `value` — only if `value` isn't `undefined`/`null`/
   * an empty string. The single most common filter shape: "search by
   * this optional query param, if present." */
  equals<K extends keyof TWhere>(field: K, value: unknown): this {
    if (value === undefined || value === null || value === "") return this;
    (this.conditions as Record<string, unknown>)[field as string] = value;
    return this;
  }

  /** Sets `field` to a Prisma `{ contains, mode: "insensitive" }` clause —
   * only if `value` is a non-empty string. */
  contains<K extends keyof TWhere>(field: K, value: string | undefined): this {
    if (!value) return this;
    (this.conditions as Record<string, unknown>)[field as string] = { contains: value, mode: "insensitive" };
    return this;
  }

  /** Sets `field` to a Prisma `{ in: [...] }` clause — only if `values` is
   * a non-empty array. */
  in<K extends keyof TWhere>(field: K, values: readonly unknown[] | undefined): this {
    if (!values || values.length === 0) return this;
    (this.conditions as Record<string, unknown>)[field as string] = { in: values };
    return this;
  }

  /** Sets `field` to a Prisma range clause (`gte`/`lte`) — only including
   * the bounds that were actually supplied. */
  range<K extends keyof TWhere>(field: K, bounds: { gte?: unknown; lte?: unknown }): this {
    const clause: Record<string, unknown> = {};
    if (bounds.gte !== undefined) clause.gte = bounds.gte;
    if (bounds.lte !== undefined) clause.lte = bounds.lte;
    if (Object.keys(clause).length === 0) return this;
    (this.conditions as Record<string, unknown>)[field as string] = clause;
    return this;
  }

  /** Adds an arbitrary already-built Prisma clause verbatim — the escape
   * hatch for a condition this builder's own named methods don't cover
   * (e.g. an `OR`/`AND` group), without blocking on this class growing a
   * method for every possible Prisma operator. */
  raw(field: keyof TWhere, clause: unknown): this {
    (this.conditions as Record<string, unknown>)[field as string] = clause;
    return this;
  }

  build(): Partial<TWhere> {
    return { ...this.conditions };
  }
}
