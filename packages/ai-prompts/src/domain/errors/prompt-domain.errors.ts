/**
 * Standalone domain error hierarchy for AI-202 — deliberately framework-
 * free (imports nothing from `@nestjs/common`, `@rmsm/shared`, or any
 * other infrastructure package), the same choice
 * `StrategyDomainError` (AI-103) made and for the same reason: a domain
 * model should be usable and testable with zero framework coupling.
 * This is NOT built on the platform's `AppError`
 * (`@rmsm/shared`) either — `@rmsm/ai-prompts` is a plain library
 * package, not a NestJS module, and has no HTTP-layer `statusCode`
 * concept of its own to carry. A future consumer (e.g. AI-201's own
 * `AiGatewayService`, or a REST controller built on top of this
 * package) is expected to catch these by `code` and translate to
 * whatever error convention that layer already uses — exactly how
 * AI-102/AI-103's own domain errors are consumed one layer up.
 */
export abstract class PromptDomainError extends Error {
  abstract readonly code: string;
  readonly context: Record<string, unknown>;

  constructor(message: string, context: Record<string, unknown> = {}) {
    super(message);
    this.name = new.target.name;
    this.context = context;
  }
}

/** No template registered under the given id. */
export class PromptNotFoundError extends PromptDomainError {
  readonly code = "PromptNotFound";
  constructor(id: string) {
    super(`No prompt template registered with id "${id}".`, { id });
  }
}

/** A template name exists, but not at the requested version. */
export class PromptVersionNotFoundError extends PromptDomainError {
  readonly code = "PromptVersionNotFound";
  constructor(name: string, version: string) {
    super(`Prompt template "${name}" has no version "${version}".`, { name, version });
  }
}

/**
 * Rendering was attempted without a value for one or more required
 * variables (no `defaultValue` declared on the corresponding
 * `PromptVariable` either).
 */
export class MissingVariableError extends PromptDomainError {
  readonly code = "MissingVariable";
  constructor(templateId: string, variableNames: readonly string[]) {
    super(
      `Prompt "${templateId}" is missing required variable(s): ${variableNames.join(", ")}.`,
      { templateId, variableNames },
    );
  }
}

/**
 * Static validation of a template (or a compilation request against
 * one) failed — unknown variables referenced, duplicate variable
 * declarations, malformed `{{...}}` placeholders, or an empty prompt
 * body. `issues` carries every failure found, not just the first, so a
 * caller (e.g. a future admin UI for editing templates) can surface all
 * of them at once.
 */
export class PromptValidationError extends PromptDomainError {
  readonly code = "PromptValidationError";
  constructor(templateId: string, issues: readonly string[]) {
    super(`Prompt "${templateId}" failed validation: ${issues.join("; ")}.`, { templateId, issues });
  }
}

/** Registering a template whose id, or (name, version) pair, is already taken. */
export class DuplicatePromptError extends PromptDomainError {
  readonly code = "DuplicatePrompt";
  constructor(identifier: string) {
    super(`A prompt template is already registered for "${identifier}".`, { identifier });
  }
}

/**
 * The template itself is structurally invalid independent of any
 * particular render call — e.g. malformed placeholder syntax
 * (`{{`/`}}` mismatch) or an empty `template` body. Distinct from
 * `PromptValidationError`, which wraps one-or-many such reasons
 * together with template identity; `InvalidPromptError` is raised by
 * lower-level parsing/rendering helpers that only know about a single
 * reason and don't have (or need) the calling template's id.
 */
export class InvalidPromptError extends PromptDomainError {
  readonly code = "InvalidPrompt";
  constructor(reason: string) {
    super(`Invalid prompt: ${reason}`, { reason });
  }
}
