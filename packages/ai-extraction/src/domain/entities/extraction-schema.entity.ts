import type { ZodType } from "zod";

/** A named, described zod schema — the unit `SchemaExtractionService`
 * validates extracted JSON against. Wrapping the raw `ZodType` in a
 * named entity (rather than passing schemas around bare) mirrors
 * `@rmsm/ai-prompts`' `PromptTemplate` pattern: schemas are things this
 * platform names, versions, and reasons about, not anonymous values. */
export interface ExtractionSchema<T> {
  readonly id: string;
  readonly name: string;
  readonly schema: ZodType<T>;
}
