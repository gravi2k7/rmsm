import type { TemplateFormat } from "@rmsm/database";

/**
 * The template rendering contract — supports variables, conditionals,
 * loops, and locale-aware rendering per the spec's Template Engine
 * section. Phase 2 will implement this against a real templating library
 * (e.g. Handlebars, which natively supports all three); this interface is
 * deliberately engine-agnostic so swapping the underlying library later
 * doesn't ripple through TemplateService's callers.
 */

export interface RenderContext {
  variables: Record<string, unknown>;
  locale: string;
}

export interface RenderedContent {
  subject?: string;
  body: string;
  format: TemplateFormat;
}

export interface TemplateEngine {
  /** Renders a template string (with the layout applied, if the template references one) against the given variables/locale. Throws a ValidationError-equivalent on unresolvable variables or malformed conditional/loop syntax — a template with bad syntax must fail loudly, not silently render blank. */
  render(templateBody: string, layoutBody: string | null, context: RenderContext): Promise<RenderedContent>;

  /** Static validation without rendering — used when an admin saves/updates a template (Phase 2's TemplateController), so a syntax error is caught at authoring time, not at the next send. */
  validateSyntax(templateBody: string): { valid: boolean; errors: string[] };
}
