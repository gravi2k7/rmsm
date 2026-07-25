import type { PromptTemplate } from "../entities/prompt-template.entity";

/**
 * The port a `PromptRegistry` (or any future consumer) programs against
 * to load/persist `PromptTemplate`s — independent of where they
 * actually live. `FilesystemPromptProvider` (infrastructure/) is the
 * only implementation today, reading `templates/*.json` off disk.
 *
 * A future `PrismaPromptRepository` (backed by `@rmsm/database`, once
 * a `PromptTemplate` model exists in `schema.prisma`) can implement
 * this exact same interface with zero change to `PromptRegistry` or
 * any application-layer code — this is the whole point of defining the
 * port here, in the domain layer, rather than letting a concrete
 * storage mechanism leak upward. Deliberately out of scope for AI-202:
 * only the interface is defined now, per the milestone's own scope
 * boundary ("design interfaces for PromptRepository... without
 * changing application code" — not "implement a database-backed one").
 */
export interface PromptRepository {
  findById(id: string): Promise<PromptTemplate | null>;
  findByName(name: string, version?: string): Promise<PromptTemplate | null>;
  findAll(): Promise<readonly PromptTemplate[]>;
  exists(id: string): Promise<boolean>;
}
