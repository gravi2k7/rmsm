import { z } from "zod";
import { MEMORY_TYPES } from "../domain/enums/memory-type.enum";

/**
 * The on-disk JSON shape `FilesystemMemoryProvider` reads/writes, one
 * file per `MemoryEntry` (`<rootDir>/<id>.json`) — hand-authored,
 * validated explicitly at the file-system boundary, the same
 * "validate every external input at its point of entry" discipline
 * `@rmsm/ai-prompts`' `prompt-template-file.schema.ts` already
 * established for this platform. Dates are ISO strings on disk (JSON
 * has no native `Date`), converted to/from real `Date` objects at the
 * provider boundary.
 */
export const memoryMetadataFileSchema = z.object({
  id: z.string().min(1),
  tags: z.array(z.string()).default([]),
  source: z.string().min(1),
  importance: z.number().min(0).max(1).optional(),
  author: z.string().min(1),
  version: z.number().int().positive(),
});

export const memoryEntryFileSchema = z.object({
  id: z.string().min(1),
  conversationId: z.string().nullable(),
  organizationId: z.string().nullable(),
  type: z.enum(MEMORY_TYPES as [string, ...string[]]),
  content: z.string(),
  metadata: memoryMetadataFileSchema,
  version: z.number().int().positive(),
  createdAt: z.string(),
  updatedAt: z.string(),
  expiresAt: z.string().nullable(),
});

export type MemoryEntryFile = z.infer<typeof memoryEntryFileSchema>;
