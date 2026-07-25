import type { ZodType } from "zod";
import type { ToolMetadata } from "./tool-metadata.entity";
import type { RetryPolicy } from "./retry-policy.entity";

/**
 * The "Tool abstraction" capability's core entity — a named,
 * versioned, schema-validated capability an agent (AI-401) can invoke.
 * `parametersSchema` is a real zod `ZodType`, reused directly (the
 * same call `@rmsm/ai-extraction`'s `ExtractionSchema<T>` made) rather
 * than this package inventing its own parameter-schema format.
 */
export interface ToolDefinition {
  readonly metadata: ToolMetadata;
  readonly parametersSchema: ZodType<unknown>;
  readonly requiredPermissions: readonly string[];
  readonly defaultTimeoutMs?: number;
  readonly defaultRetry?: RetryPolicy;
}
