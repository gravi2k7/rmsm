/**
 * Public API of `@rmsm/ai-prompts` — AI-202, the Prompt Management
 * System. Per the module's own charter: this becomes the ONLY way
 * prompts are managed inside RMSM. No other module should manually
 * concatenate prompt strings — build/compose templates through
 * `PromptCompiler`, resolve them through a `PromptRegistry`, and hand
 * the resulting `CompiledPrompt` straight to a consumer such as
 * AI-201's `AiGatewayService.chat()`.
 *
 * Deliberately NOT exported (infrastructure leakage this package
 * avoids on purpose): the on-disk JSON file schema
 * (`prompt-template-file.schema.ts`) and the placeholder regex
 * internals inside `variable-renderer.ts` — callers work with
 * `PromptTemplate` domain objects and the functions below, never with
 * how a template happened to be stored.
 */

// Domain
export type { PromptTemplate } from "./domain/entities/prompt-template.entity";
export type { PromptVersion } from "./domain/entities/prompt-version.entity";
export type { PromptVariable } from "./domain/entities/prompt-variable.entity";
export type { PromptMetadata } from "./domain/entities/prompt-metadata.entity";
export type { CompiledPrompt } from "./domain/entities/compiled-prompt.entity";
export { PromptType, PROMPT_TYPES } from "./domain/enums/prompt-type.enum";
export type { PromptRepository } from "./domain/repositories/prompt-repository.interface";
export {
  PromptDomainError,
  PromptNotFoundError,
  PromptVersionNotFoundError,
  MissingVariableError,
  PromptValidationError,
  DuplicatePromptError,
  InvalidPromptError,
} from "./domain/errors/prompt-domain.errors";

// Application — rendering
export { renderTemplate, resolveEffectiveVariables, extractVariableNames, findMalformedPlaceholders } from "./application/rendering/variable-renderer";
export type { RenderTemplateParams, ResolveVariablesParams } from "./application/rendering/variable-renderer";

// Application — validation
export { validateTemplate, assertValidTemplate } from "./application/validation/prompt-validator";
export type { PromptValidationIssue, PromptValidationIssueType } from "./application/validation/prompt-validator";

// Application — compiler
export { PromptCompiler } from "./application/compiler/prompt-compiler";
export type { PromptFragment, PromptCompositionInput } from "./application/compiler/prompt-compiler";

// Registry
export { PromptRegistry } from "./registry/prompt-registry";
export type { PromptListFilter } from "./registry/prompt-registry";

// Infrastructure — the filesystem provider and its registry-loading convenience
// are real, sanctioned integration points, not leakage: AI-202 promises a
// working default provider ("filesystem now, database-compatible later")
// and this is how a consumer (AI-201, or apps/api's composition root) gets one.
export { FilesystemPromptProvider } from "./infrastructure/filesystem-prompt.provider";
export { loadFilesystemPromptRegistry } from "./infrastructure/load-filesystem-registry";
