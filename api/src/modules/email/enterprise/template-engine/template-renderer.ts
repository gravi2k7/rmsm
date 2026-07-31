import { Injectable } from "@nestjs/common";
import { TemplateEngine } from "./template-engine";
import { BASE_LAYOUT } from "./layouts/base-layout";
import { SHARED_PARTIALS } from "./partials/shared.partials";
import { markdownToHtml, toPlainText } from "./markdown.util";
import type { TemplateDefinition } from "./template-definition";
import type { RenderedTemplate, TemplateVariables } from "../types/email-platform.types";

/**
 * EM-001's own Template Renderer — the orchestration layer above
 * `TemplateEngine`: resolves a `TemplateDefinition`'s `format`
 * (HTML vs. markdown), renders its body/subject, wraps the body in
 * `BASE_LAYOUT`, and derives a plain-text alternative when the
 * definition doesn't supply one explicitly. Returns exactly the
 * `{subject, html, text}` shape `EnterpriseEmailService.sendTemplate()`
 * hands straight to a provider's `send()`.
 *
 * `BASE_LAYOUT`'s own `{{subject}}`/`{{content}}`/`{{footer}}` slots are
 * filled with plain string substitution rather than a second
 * `TemplateEngine.render()` pass — running the engine over the layout
 * would treat those three slots as ordinary `{{variable}}` references and
 * replace any not present in the variables bag with `""` before this
 * method ever gets to insert the real rendered body, silently blanking
 * the layout. The engine is for template AUTHORS' own `{{variables}}`;
 * the layout's fixed slots are this renderer's own internal wiring.
 */
@Injectable()
export class TemplateRenderer {
  constructor(private readonly engine: TemplateEngine) {}

  render(definition: TemplateDefinition, variables: TemplateVariables): RenderedTemplate {
    const subject = this.engine.render(definition.subject, variables, { escapeHtml: false });

    const rawBody = this.engine.render(definition.body, variables, { partials: SHARED_PARTIALS, escapeHtml: definition.format === "html" });
    const htmlBody = definition.format === "markdown" ? markdownToHtml(rawBody) : rawBody;

    const footer = this.engine.render(SHARED_PARTIALS.footer ?? "", { ...variables, year: new Date().getFullYear() }, { escapeHtml: false });

    const html = BASE_LAYOUT.replace("{{subject}}", this.escapeForTitle(subject)).replace("{{content}}", htmlBody).replace("{{footer}}", footer);

    const text = definition.textBody ? this.engine.render(definition.textBody, variables, { escapeHtml: false }) : toPlainText(htmlBody);

    return { subject, html, text };
  }

  private escapeForTitle(subject: string): string {
    return subject.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
}
