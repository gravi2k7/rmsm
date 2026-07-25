import type { PromptTemplate } from "../../domain/entities/prompt-template.entity";
import { PromptValidationError } from "../../domain/errors/prompt-domain.errors";
import { extractVariableNames, findMalformedPlaceholders } from "../rendering/variable-renderer";

export type PromptValidationIssueType =
  | "empty-prompt"
  | "malformed-placeholder"
  | "duplicate-variable"
  | "unknown-variable"
  | "missing-variable";

export interface PromptValidationIssue {
  readonly type: PromptValidationIssueType;
  readonly message: string;
}

/**
 * Structural validation of a `PromptTemplate` — every check the spec
 * names, run every time: empty prompt body, malformed `{{...}}`
 * syntax, a variable declared more than once in `template.variables`,
 * and a `{{name}}` used in the body that was never declared ("unknown
 * variable" — the inverse of `MissingVariableError`, which is a
 * render-time concern about missing *values*, not missing
 * *declarations*).
 *
 * `providedVariables`, when passed, adds one more check: a declared,
 * `required` variable with no `defaultValue` and no entry in
 * `providedVariables` — the same condition `renderTemplate` itself
 * enforces by throwing, exposed here as a non-throwing pre-flight
 * report so a caller (the compiler, or a future admin UI validating a
 * template edit) can see every problem at once instead of hitting them
 * one at a time across repeated render attempts.
 */
export function validateTemplate(
  template: PromptTemplate,
  providedVariables?: Readonly<Record<string, string>>,
): PromptValidationIssue[] {
  const issues: PromptValidationIssue[] = [];

  if (template.template.trim().length === 0) {
    issues.push({ type: "empty-prompt", message: "Template body is empty." });
  }

  for (const raw of findMalformedPlaceholders(template.template)) {
    issues.push({ type: "malformed-placeholder", message: `Malformed placeholder syntax: "${raw}".` });
  }

  const seen = new Set<string>();
  for (const variable of template.variables) {
    if (seen.has(variable.name)) {
      issues.push({ type: "duplicate-variable", message: `Variable "${variable.name}" is declared more than once.` });
    }
    seen.add(variable.name);
  }

  const declaredNames = new Set(template.variables.map((v) => v.name));
  for (const name of extractVariableNames(template.template)) {
    if (!declaredNames.has(name)) {
      issues.push({ type: "unknown-variable", message: `Variable "{{${name}}}" is used but not declared in this template's variables.` });
    }
  }

  if (providedVariables) {
    for (const variable of template.variables) {
      const hasValue = Object.prototype.hasOwnProperty.call(providedVariables, variable.name);
      const hasDefault = variable.defaultValue !== undefined;
      if (variable.required && !hasValue && !hasDefault) {
        issues.push({ type: "missing-variable", message: `Required variable "${variable.name}" has no value and no default.` });
      }
    }
  }

  return issues;
}

/** `validateTemplate`, but throws `PromptValidationError` (with every issue attached) instead of returning a report. */
export function assertValidTemplate(
  template: PromptTemplate,
  providedVariables?: Readonly<Record<string, string>>,
): void {
  const issues = validateTemplate(template, providedVariables);
  if (issues.length > 0) {
    throw new PromptValidationError(
      template.id,
      issues.map((issue) => issue.message),
    );
  }
}
