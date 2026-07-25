import { readdir, readFile, writeFile, unlink, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { MemoryEntry } from "../domain/entities/memory-entry.entity";
import type { MemoryType } from "../domain/enums/memory-type.enum";
import type { MemoryQuery } from "../domain/entities/memory-query.entity";
import type { MemoryResult } from "../domain/entities/memory-result.entity";
import type { MemoryRepository } from "../repositories/memory-repository.interface";
import { InvalidMemoryQueryError } from "../domain/errors/memory-domain.errors";
import { memoryEntryFileSchema } from "./memory-entry-file.schema";
import { filterMemoryEntries } from "./memory-query-filter";

function toFile(entry: MemoryEntry): string {
  return JSON.stringify(
    {
      ...entry,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
      expiresAt: entry.expiresAt ? entry.expiresAt.toISOString() : null,
    },
    null,
    2,
  );
}

function fromFile(raw: unknown, filePath: string): MemoryEntry {
  const result = memoryEntryFileSchema.safeParse(raw);
  if (!result.success) {
    throw new InvalidMemoryQueryError(`"${filePath}" failed schema validation: ${result.error.message}`);
  }
  const data = result.data;
  return {
    ...data,
    type: data.type as MemoryType,
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
    expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
  };
}

/**
 * A durable `MemoryRepository` implementation — one JSON file per
 * `MemoryEntry` under `rootDir`, validated against
 * `memoryEntryFileSchema` on every read. The right choice for a
 * long-running process (or one that needs memory to survive a
 * restart) that doesn't yet have a real database-backed
 * implementation wired in — mirrors `@rmsm/ai-prompts`'
 * `FilesystemPromptProvider` in shape and intent.
 */
export class FilesystemMemoryProvider implements MemoryRepository {
  constructor(private readonly rootDir: string) {}

  async findById(id: string): Promise<MemoryEntry | null> {
    try {
      const raw = await readFile(join(this.rootDir, `${id}.json`), "utf-8");
      return fromFile(JSON.parse(raw), id);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  async query(query: MemoryQuery): Promise<MemoryResult> {
    const all = await this.loadAll();
    return filterMemoryEntries(all, query);
  }

  async save(entry: MemoryEntry): Promise<void> {
    await mkdir(this.rootDir, { recursive: true });
    await writeFile(join(this.rootDir, `${entry.id}.json`), toFile(entry), "utf-8");
  }

  async delete(id: string): Promise<void> {
    try {
      await unlink(join(this.rootDir, `${id}.json`));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  async deleteExpired(asOf: Date): Promise<number> {
    const all = await this.loadAll();
    let removed = 0;
    for (const entry of all) {
      if (entry.expiresAt && entry.expiresAt <= asOf) {
        await this.delete(entry.id);
        removed++;
      }
    }
    return removed;
  }

  private async loadAll(): Promise<MemoryEntry[]> {
    let fileNames: string[];
    try {
      fileNames = await readdir(this.rootDir);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }

    const entries: MemoryEntry[] = [];
    for (const fileName of fileNames) {
      if (!fileName.endsWith(".json")) continue;
      const filePath = join(this.rootDir, fileName);
      const raw = await readFile(filePath, "utf-8");
      entries.push(fromFile(JSON.parse(raw), filePath));
    }
    return entries;
  }
}
