import { Injectable } from "@nestjs/common";
import type { TemplateVariables } from "../types/email-platform.types";

export interface TemplateEngineOptions {
  /** Partial templates addressable via `{{> name}}` — resolved by name, not by file path, so callers never expose a filesystem layout. */
  partials?: Record<string, string>;
  /** When true, variable interpolation HTML-escapes values (the default for HTML bodies); plain-text/markdown rendering passes `false`. */
  escapeHtml?: boolean;
}

const HTML_ESCAPE_MAP: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/**
 * EM-001's own Template Engine section: Variables (`{{name}}`),
 * Conditional blocks, Partial Templates, Reusable layouts — plus HTML
 * Templates, Plain Text Templates, and Markdown Templates support (the
 * last two handled by `TemplateRenderer`, which is what actually knows a
 * given template's declared format; this engine only ever manipulates
 * strings and has no opinion on HTML vs. markdown vs. text).
 *
 * Deliberately dependency-free — no Handlebars/Mustache/EJS. The syntax
 * this milestone needs (variable interpolation, one level of `{{#if}}`
 * conditionals, named partial inclusion) is small enough that a real
 * templating library would be more surface area than value, consistent
 * with this project's general "no vendor SDK unless the integration
 * genuinely needs one" convention (see e.g. `ResendEmailProvider`'s own
 * doc comment) applied here to templating rather than a network
 * protocol.
 */
@Injectable()
export class TemplateEngine {
  render(source: string, variables: TemplateVariables, options: TemplateEngineOptions = {}): string {
    let result = this.renderPartials(source, options.partials ?? {});
    result = this.renderConditionals(result, variables);
    result = this.renderVariables(result, variables, options.escapeHtml ?? false);
    return result;
  }

  /** `{{> partialName}}` — resolved before conditionals/variables run, so a partial's own `{{var}}`/`{{#if}}` markup is processed against the caller's variables in the same pass (a partial is a literal text substitution, not a nested render). */
  private renderPartials(source: string, partials: Record<string, string>): string {
    return source.replace(/\{\{>\s*([\w.-]+)\s*\}\}/g, (_match, name: string) => partials[name] ?? "");
  }

  /** `{{#if varName}}...{{/if}}` — a variable is "truthy" the same way JavaScript treats it, except the string `"false"` and `"0"` are also treated as falsy (variables always arrive as already-formatted strings/numbers/booleans from callers, so a literal `"false"` string is a common real case to guard against, not just the JS boolean `false`). No `{{#unless}}`/`{{else}}` — EM-001 names "conditional blocks," singular form, and every shipped template only ever needs presence/absence, not branching. */
  private renderConditionals(source: string, variables: TemplateVariables): string {
    return source.replace(/\{\{#if\s+([\w.-]+)\s*\}\}([\s\S]*?)\{\{\/if\}\}/g, (_match, varName: string, block: string) => {
      const value = variables[varName];
      return this.isTruthy(value) ? block : "";
    });
  }

  private renderVariables(source: string, variables: TemplateVariables, escapeHtml: boolean): string {
    return source.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_match, varName: string) => {
      const value = variables[varName];
      const asString = value === undefined ? "" : String(value);
      return escapeHtml ? this.escape(asString) : asString;
    });
  }

  private isTruthy(value: TemplateVariables[string]): boolean {
    if (value === undefined) return false;
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    return value.length > 0 && value !== "false" && value !== "0";
  }

  private escape(value: string): string {
    return value.replace(/[&<>"']/g, (ch) => HTML_ESCAPE_MAP[ch] ?? ch);
  }
}
