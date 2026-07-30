import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { PromptRepository } from "../domain/repositories/prompt-repository.interface";
import type { PromptTemplate } from "../domain/entities/prompt-template.entity";
import { PromptType } from "../domain/enums/prompt-type.enum";
import { InvalidPromptError } from "../domain/errors/prompt-domain.errors";
import { compareVersions } from "../domain/version-compare";
import { promptTemplateFileSchema } from "./prompt-template-file.schema";

/** One subfolder of `templates/` per `PROMPT TYPES` use-case category the spec names. */
const TEMPLATE_CATEGORIES = ["chat", "analysis", "coding", "research", "summary", "system"] as const;

/**
 * The default `templates/` directory this package ships with —
 * resolved relative to this module's own location (not `process.cwd()`,
 * which would break the moment a consumer imports `@rmsm/ai-prompts`
 * from a different working directory, e.g. `apps/api` running from the
 * repo root).
 *
 * Uses CommonJS's `__dirname` rather than `import.meta.url` — this
 * package now compiles to CommonJS (see `tsconfig.build.json`), same as
 * every other runtime package in the workspace, and `import.meta` isn't
 * valid in CJS output. The build script copies `src/templates/` to
 * `dist/templates/` alongside the compiled JS specifically so this
 * still resolves correctly at runtime either way: one level up from
 * `dist/infrastructure/` reaches `dist/`, which is where `templates/`
 * now lives, mirroring `src/infrastructure/` -> `src/templates/`.
 */
function defaultTemplatesRoot(): string {
  return join(__dirname, "..", "templates");
}

/**
 * The first (and, for AI-202, only) implementation of the
 * `PromptRepository` port — reads `PromptTemplate`s from
 * `templates/<category>/*.json` on disk, validating each file against
 * `promptTemplateFileSchema` before it ever becomes a domain object. A
 * malformed file fails loudly (`InvalidPromptError`, naming the file)
 * rather than being silently skipped — a broken template file is an
 * authoring bug that should never make it to production unnoticed.
 *
 * `rootDir` is a constructor parameter, not hard-coded, specifically so
 * a future `PrismaPromptRepository` (or a test double pointed at a
 * fixture directory) can exist side by side with this one — "future
 * providers should be injectable," per the spec.
 */
export class FilesystemPromptProvider implements PromptRepository {
  constructor(private readonly rootDir: string = defaultTemplatesRoot()) {}

  async findAll(): Promise<readonly PromptTemplate[]> {
    const templates: PromptTemplate[] = [];
    for (const category of TEMPLATE_CATEGORIES) {
      templates.push(...(await this.loadCategory(category)));
    }
    return templates;
  }

  async findById(id: string): Promise<PromptTemplate | null> {
    const all = await this.findAll();
    return all.find((template) => template.id === id) ?? null;
  }

  async findByName(name: string, version?: string): Promise<PromptTemplate | null> {
    const all = await this.findAll();
    const matches = all.filter((template) => template.name === name);
    if (matches.length === 0) return null;
    if (version === undefined) {
      return matches.reduce((latest, candidate) => (compareVersions(candidate.version, latest.version) > 0 ? candidate : latest));
    }
    return matches.find((template) => template.version === version) ?? null;
  }

  async exists(id: string): Promise<boolean> {
    return (await this.findById(id)) !== null;
  }

  private async loadCategory(category: string): Promise<PromptTemplate[]> {
    const categoryDir = join(this.rootDir, category);
    let entries: string[];
    try {
      entries = await readdir(categoryDir);
    } catch {
      // A category folder that doesn't exist yet has no templates — not an error.
      return [];
    }

    const templates: PromptTemplate[] = [];
    for (const entry of entries) {
      if (!entry.endsWith(".json")) continue;
      const filePath = join(categoryDir, entry);
      const raw = await readFile(filePath, "utf-8");

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch (cause) {
        throw new InvalidPromptError(`"${filePath}" is not valid JSON: ${(cause as Error).message}`);
      }

      const result = promptTemplateFileSchema.safeParse(parsed);
      if (!result.success) {
        throw new InvalidPromptError(`"${filePath}" failed schema validation: ${result.error.message}`);
      }

      templates.push({
        ...result.data,
        type: result.data.type as PromptType,
      });
    }
    return templates;
  }
}
