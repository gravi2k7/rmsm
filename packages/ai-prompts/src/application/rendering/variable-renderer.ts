import type { PromptVariable } from "../../domain/entities/prompt-variable.entity";
import { MissingVariableError } from "../../domain/errors/prompt-domain.errors";

/**
 * The one placeholder syntax AI-202 supports: `{{name}}`, where `name`
 * is a valid identifier (`[A-Za-z_][A-Za-z0-9_]*`), with optional
 * whitespace inside the braces (`{{ name }}` is equivalent to
 * `{{name}}`). A factory, not a shared module-level `RegExp`
 * instance — every caller here uses `.exec`/`.replace` in a loop, and a
 * single shared `g`-flagged regex carries mutable `lastIndex` state
 * that would corrupt concurrent/re-entrant scans.
 */
const placeholderPattern = (): RegExp => /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g;

/** Every distinct variable name referenced via `{{name}}` in `template`, in first-seen order. */
export function extractVariableNames(template: string): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;
  const pattern = placeholderPattern();
  while ((match = pattern.exec(template)) !== null) {
    const name = match[1] as string;
    if (!seen.has(name)) {
      seen.add(name);
      names.push(name);
    }
  }
  return names;
}

/**
 * Any `{{`/`}}` occurrence that is NOT part of a well-formed
 * `{{identifier}}` placeholder — an empty placeholder (`{{}}`), a name
 * starting with a digit (`{{1abc}}`), or unbalanced braces
 * (`{{unclosed`, stray `}}`). Returns the offending raw text for each
 * one found, for use in a `PromptValidationError`'s issue list.
 */
export function findMalformedPlaceholders(template: string): string[] {
  const withoutWellFormed = template.replace(placeholderPattern(), "");
  const strayBraces = /\{\{[^{}]*\}\}|\{\{|\}\}/g;
  const issues: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = strayBraces.exec(withoutWellFormed)) !== null) {
    issues.push(match[0]);
  }
  return issues;
}

export interface ResolveVariablesParams {
  /** Identity used in any `MissingVariableError` thrown — the owning template's `id`, not a rendering concept of its own. */
  readonly templateId: string;
  readonly template: string;
  readonly variables: Readonly<Record<string, string>>;
  /** Declared variables to consult for `defaultValue` fallback when `variables` doesn't supply a value. Optional — omit to require every referenced variable be supplied explicitly. */
  readonly declaredVariables?: readonly PromptVariable[];
}

/**
 * Resolves the final value for every `{{name}}` placeholder referenced
 * in `template` — an explicit entry in `variables` takes precedence
 * over a declared `defaultValue`. Throws `MissingVariableError`,
 * naming every unresolved variable at once, if any placeholder has
 * neither. Shared by `renderTemplate` (which then substitutes the
 * result into the template text) and `PromptCompiler` (which needs the
 * resolved map itself, across every fragment, for `CompiledPrompt.variables`).
 */
export function resolveEffectiveVariables(params: ResolveVariablesParams): Record<string, string> {
  const { templateId, template, variables, declaredVariables = [] } = params;

  const defaults = new Map<string, string>();
  for (const declared of declaredVariables) {
    if (declared.defaultValue !== undefined) defaults.set(declared.name, declared.defaultValue);
  }

  const referenced = extractVariableNames(template);
  const effective: Record<string, string> = {};
  const missing: string[] = [];

  for (const name of referenced) {
    if (Object.prototype.hasOwnProperty.call(variables, name)) {
      effective[name] = variables[name] as string;
    } else if (defaults.has(name)) {
      effective[name] = defaults.get(name) as string;
    } else {
      missing.push(name);
    }
  }

  if (missing.length > 0) {
    throw new MissingVariableError(templateId, missing);
  }

  return effective;
}

export type RenderTemplateParams = ResolveVariablesParams;

/** Substitutes every `{{name}}` placeholder in `template` with its value, resolved via `resolveEffectiveVariables`. */
export function renderTemplate(params: RenderTemplateParams): string {
  const effective = resolveEffectiveVariables(params);
  return params.template.replace(placeholderPattern(), (_match, name: string) => effective[name] as string);
}
