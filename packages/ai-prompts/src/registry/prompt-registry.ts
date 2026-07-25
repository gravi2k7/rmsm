import type { PromptTemplate } from "../domain/entities/prompt-template.entity";
import type { PromptVersion } from "../domain/entities/prompt-version.entity";
import type { PromptType } from "../domain/enums/prompt-type.enum";
import {
  DuplicatePromptError,
  PromptNotFoundError,
  PromptVersionNotFoundError,
} from "../domain/errors/prompt-domain.errors";
import { assertValidTemplate } from "../application/validation/prompt-validator";
import { compareVersions } from "../domain/version-compare";

export interface PromptListFilter {
  readonly type?: PromptType;
  readonly tag?: string;
}

/**
 * The in-memory index every `PromptTemplate` in the system is looked up
 * through — the single source of truth AI-202's spec means by "this
 * module becomes the ONLY way prompts are managed inside RMSM." Not
 * itself a storage mechanism: it holds whatever `PromptTemplate`s were
 * registered into it (typically populated once at startup by
 * `loadFilesystemPromptRegistry`, infrastructure/), and is what every
 * other layer — the compiler, a future AI-201 integration — actually
 * calls `get`/`list` against.
 */
export class PromptRegistry {
  private readonly byId = new Map<string, PromptTemplate>();
  /** name -> version -> template */
  private readonly byNameVersion = new Map<string, Map<string, PromptTemplate>>();
  /** name -> version history, in registration order */
  private readonly history = new Map<string, PromptVersion[]>();

  /**
   * Validates `template` structurally (throws `PromptValidationError`
   * if invalid), then registers it under both its `id` and its
   * `(name, version)` pair. Throws `DuplicatePromptError` if either is
   * already taken — registration is add-only; re-registering the same
   * id or (name, version) is always a mistake, never an update (a real
   * update is a new version).
   */
  register(template: PromptTemplate, author: string): void {
    assertValidTemplate(template);

    if (this.byId.has(template.id)) {
      throw new DuplicatePromptError(template.id);
    }
    const versions = this.byNameVersion.get(template.name);
    if (versions?.has(template.version)) {
      throw new DuplicatePromptError(`${template.name}@${template.version}`);
    }

    this.byId.set(template.id, template);
    if (!this.byNameVersion.has(template.name)) this.byNameVersion.set(template.name, new Map());
    this.byNameVersion.get(template.name)?.set(template.version, template);

    if (!this.history.has(template.name)) this.history.set(template.name, []);
    this.history.get(template.name)?.push({ version: template.version, createdAt: new Date(), author });
  }

  /** Lookup by id — a specific, immutable template version. Throws `PromptNotFoundError` if absent. */
  get(id: string): PromptTemplate {
    const template = this.byId.get(id);
    if (!template) throw new PromptNotFoundError(id);
    return template;
  }

  /**
   * Lookup by name, resolving to the highest registered `version` when
   * `version` is omitted. Throws `PromptNotFoundError` if the name was
   * never registered at all, or `PromptVersionNotFoundError` if the
   * name exists but not at the requested version.
   */
  getByName(name: string, version?: string): PromptTemplate {
    const versions = this.byNameVersion.get(name);
    if (!versions || versions.size === 0) throw new PromptNotFoundError(name);

    if (version === undefined) {
      const latest = [...versions.keys()].sort(compareVersions).at(-1) as string;
      return versions.get(latest) as PromptTemplate;
    }

    const template = versions.get(version);
    if (!template) throw new PromptVersionNotFoundError(name, version);
    return template;
  }

  exists(id: string): boolean {
    return this.byId.has(id);
  }

  existsByName(name: string, version?: string): boolean {
    const versions = this.byNameVersion.get(name);
    if (!versions) return false;
    return version === undefined ? versions.size > 0 : versions.has(version);
  }

  /** Every registered template (latest and prior versions alike), optionally filtered by `type` and/or `tag`. */
  list(filter: PromptListFilter = {}): PromptTemplate[] {
    const all = [...this.byId.values()];
    return all.filter((template) => {
      if (filter.type !== undefined && template.type !== filter.type) return false;
      if (filter.tag !== undefined && !template.metadata.tags.includes(filter.tag)) return false;
      return true;
    });
  }

  /** The registration-order version history for a template name. Throws `PromptNotFoundError` if the name was never registered. */
  versions(name: string): PromptVersion[] {
    const history = this.history.get(name);
    if (!history) throw new PromptNotFoundError(name);
    return [...history];
  }
}
