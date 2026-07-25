import { z } from "zod";
import { PROMPT_TYPES } from "../domain/enums/prompt-type.enum";

/**
 * The on-disk JSON shape `FilesystemPromptProvider` reads from
 * `templates/<category>/*.json`. Deliberately a plain, hand-authored
 * zod schema (not derived from the `PromptTemplate` TS interface) —
 * this is the boundary between untrusted file content and the domain
 * model, and the project's own convention (`packages/config/src/env.schema.ts`)
 * is to validate every external input explicitly at its point of entry
 * rather than trust a cast.
 */
export const promptVariableFileSchema = z.object({
  name: z.string().min(1),
  required: z.boolean(),
  defaultValue: z.string().optional(),
  description: z.string().optional(),
});

export const promptMetadataFileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  tags: z.array(z.string()).default([]),
  providerCompatibility: z.array(z.string()).default([]),
  temperatureRecommendation: z.number().min(0).max(2).optional(),
  maxTokensRecommendation: z.number().int().positive().optional(),
  author: z.string().min(1),
  version: z.string().min(1),
});

export const promptTemplateFileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  version: z.string().min(1),
  type: z.enum(PROMPT_TYPES as [string, ...string[]]),
  template: z.string(),
  variables: z.array(promptVariableFileSchema).default([]),
  metadata: promptMetadataFileSchema,
});

export type PromptTemplateFile = z.infer<typeof promptTemplateFileSchema>;
