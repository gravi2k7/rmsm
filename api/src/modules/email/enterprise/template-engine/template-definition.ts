import type { EmailTemplateId } from "../contracts/email-platform.contracts";

export interface TemplateDefinition {
  id: EmailTemplateId;
  category: "Authentication" | "Organization" | "Security" | "Billing" | "AI Platform" | "Portfolio" | "System";
  format: "html" | "markdown";
  /** May itself contain `{{variables}}`. */
  subject: string;
  /** The template body — HTML markup or markdown, per `format` — may use `{{variables}}`, `{{#if cond}}...{{/if}}`, and `{{> partialName}}`. Rendered inside `BASE_LAYOUT`'s `{{content}}` slot. */
  body: string;
  /** Optional explicit plain-text alternative; when absent, derived automatically from the rendered body via `toPlainText()`. */
  textBody?: string;
  /** Names of variables this template's body/subject reference — purely documentation + used by `EmailAdminService.previewTemplate()` to synthesize placeholder values when the caller doesn't supply real ones. */
  sampleVariables: Record<string, string>;
}
