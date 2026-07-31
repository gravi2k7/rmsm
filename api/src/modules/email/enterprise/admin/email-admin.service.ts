import { Injectable, Logger } from "@nestjs/common";
import { EmailProviderRegistry } from "../providers/email-provider.registry";
import { TemplateRegistry } from "../template-engine/template-registry";
import { TemplateRenderer } from "../template-engine/template-renderer";
import type { EmailProviderId } from "../contracts/email-platform.contracts";
import type { EmailTemplateId } from "../contracts/email-platform.contracts";
import type { EmailSendResult, RenderedTemplate, TemplateVariables } from "../types/email-platform.types";

export interface ConfigurationValidationResult {
  provider: EmailProviderId;
  enabled: boolean;
  connectionOk: boolean;
  issues: string[];
}

/**
 * EM-001's own Admin Features section: Send Test Email, Preview
 * Template, Validate Configuration. A thin façade over the registry and
 * template layer — no new state of its own, matching every other
 * "orchestration only" service in this codebase (e.g.
 * `MarketDataAdminService`, referenced in `market-data.module.ts`'s own
 * doc comment).
 */
@Injectable()
export class EmailAdminService {
  private readonly logger = new Logger(EmailAdminService.name);

  constructor(
    private readonly registry: EmailProviderRegistry,
    private readonly templates: TemplateRegistry,
    private readonly renderer: TemplateRenderer,
  ) {}

  async sendTestEmail(to: string): Promise<EmailSendResult> {
    const provider = this.registry.getActive();
    this.logger.log({ msg: "email.admin.send_test", provider: provider.type, to: this.maskRecipient(to) });
    return provider.send({
      to: [to],
      subject: "RMSM Email Platform — Test Email",
      html: `<p>This is a test email sent from the RMSM Enterprise Email Platform via the <strong>${provider.type}</strong> provider.</p>`,
      text: `This is a test email sent from the RMSM Enterprise Email Platform via the ${provider.type} provider.`,
    });
  }

  previewTemplate(templateId: EmailTemplateId, variableOverrides: TemplateVariables = {}): RenderedTemplate {
    const definition = this.templates.get(templateId);
    return this.renderer.render(definition, { ...definition.sampleVariables, ...variableOverrides });
  }

  async validateConfiguration(): Promise<ConfigurationValidationResult> {
    const provider = this.registry.getActive();
    const issues: string[] = [];
    if (!provider.enabled) issues.push(`Active provider "${provider.type}" is not fully configured (missing required credentials).`);

    const connectionOk = provider.enabled ? await provider.verifyConnection().catch(() => false) : false;
    if (provider.enabled && !connectionOk) issues.push(`Active provider "${provider.type}" is configured but its connection check failed.`);

    return { provider: provider.type, enabled: provider.enabled, connectionOk, issues };
  }

  /** Shows only the local part's first character plus the full domain — enough to spot-check a test send target in logs, never the full address. */
  private maskRecipient(email: string): string {
    const [local, domain] = email.split("@");
    if (!domain) return "****";
    return `${(local ?? "").slice(0, 1)}***@${domain}`;
  }
}
