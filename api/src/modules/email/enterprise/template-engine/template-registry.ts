import { Injectable } from "@nestjs/common";
import { ValidationError } from "@rmsm/shared";
import type { EmailTemplateId } from "../contracts/email-platform.contracts";
import type { TemplateDefinition } from "./template-definition";
import { AUTH_TEMPLATES } from "./definitions/auth.templates";
import { ORGANIZATION_TEMPLATES } from "./definitions/organization.templates";
import { SECURITY_TEMPLATES } from "./definitions/security.templates";
import { BILLING_TEMPLATES } from "./definitions/billing.templates";
import { AI_PLATFORM_TEMPLATES } from "./definitions/ai-platform.templates";
import { PORTFOLIO_TEMPLATES } from "./definitions/portfolio.templates";
import { SYSTEM_TEMPLATES } from "./definitions/system.templates";

const ALL_TEMPLATES: TemplateDefinition[] = [
  ...AUTH_TEMPLATES,
  ...ORGANIZATION_TEMPLATES,
  ...SECURITY_TEMPLATES,
  ...BILLING_TEMPLATES,
  ...AI_PLATFORM_TEMPLATES,
  ...PORTFOLIO_TEMPLATES,
  ...SYSTEM_TEMPLATES,
];

/**
 * EM-001's own "Templates" section — the 26 named enterprise templates
 * across 7 categories, aggregated from `definitions/*.templates.ts` into
 * one id-keyed lookup. Used by `EnterpriseEmailService.sendTemplate()`
 * and `EmailAdminService.previewTemplate()`.
 */
@Injectable()
export class TemplateRegistry {
  private readonly byId = new Map<EmailTemplateId, TemplateDefinition>(ALL_TEMPLATES.map((t) => [t.id, t]));

  get(id: EmailTemplateId): TemplateDefinition {
    const definition = this.byId.get(id);
    if (!definition) throw new ValidationError(`No email template registered for id "${id}".`);
    return definition;
  }

  tryGet(id: EmailTemplateId): TemplateDefinition | null {
    return this.byId.get(id) ?? null;
  }

  listAll(): TemplateDefinition[] {
    return [...this.byId.values()];
  }
}
