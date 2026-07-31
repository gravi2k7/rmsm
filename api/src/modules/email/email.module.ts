import { Global, Module } from "@nestjs/common";
import { EmailService } from "./email.service.interface";
import { EMAIL_PLATFORM_PROVIDERS } from "./enterprise/email-platform.module";
import { EnterpriseEmailService } from "./enterprise/enterprise-email.service";
import { EmailProviderRegistry } from "./enterprise/providers/email-provider.registry";
import { EmailAdminService } from "./enterprise/admin/email-admin.service";
import { EmailHealthProvider } from "./enterprise/health/email-health.provider";
import { TemplateRegistry } from "./enterprise/template-engine/template-registry";
import { TemplateRenderer } from "./enterprise/template-engine/template-renderer";
import { EmailQueueService } from "./enterprise/queue/email-queue.service";
import { EmailTrackerService } from "./enterprise/tracking/email-tracker.service";
import { EmailCacheService } from "./enterprise/cache/email-cache.service";

/**
 * EM-001 — expanded from Module 002's console-only binding into the full
 * Enterprise Email Platform. `EmailService` (`./email.service.interface.ts`,
 * unchanged) is now bound to `EnterpriseEmailService`
 * (`./enterprise/enterprise-email.service.ts`) instead of directly to
 * `ConsoleEmailService` — but `EnterpriseEmailService.send()` still
 * ultimately routes through `ConsoleEmailProvider`, which itself wraps
 * `ConsoleEmailService`, whenever `EMAIL_PROVIDER=console` (the default,
 * and the only value ever exercised by Authentication's existing tests),
 * so `AuthService`'s verification/welcome/password-reset emails produce
 * the exact same console log output as before EM-001. `ConsoleEmailService`
 * itself is untouched and still exported here — nothing about
 * Authentication's own dependency graph changes.
 *
 * Every enterprise-platform piece (`EmailProviderRegistry`,
 * `EmailAdminService`, `EmailHealthProvider`, `TemplateRegistry`,
 * `TemplateRenderer`, `EmailQueueService`, `EmailTrackerService`,
 * `EmailCacheService`) is exported alongside `EmailService` — this
 * module stays `@Global()`, so any future RMSM module (Organization
 * invitations, Security alerts, Billing, AI Platform, Portfolio
 * summaries, System notices — EM-001's own template catalog) can inject
 * them directly without a new module import, per EM-001's own "Future
 * RMSM modules must use this module instead of implementing their own
 * email logic" note.
 */
@Global()
@Module({
  // `useExisting` (not `useClass`) so `EmailService` resolves to the SAME
  // `EnterpriseEmailService` singleton `EMAIL_PLATFORM_PROVIDERS` already
  // registers under its own class token — one instance, two tokens: narrow
  // callers (AuthService) inject `EmailService`; future callers that need
  // `sendTemplate()`/`sendEnterprise()` inject `EnterpriseEmailService`
  // directly. `useClass` here would construct a second, wastefully
  // separate instance.
  providers: [...EMAIL_PLATFORM_PROVIDERS, { provide: EmailService, useExisting: EnterpriseEmailService }],
  exports: [
    EmailService,
    EmailProviderRegistry,
    EmailAdminService,
    EmailHealthProvider,
    TemplateRegistry,
    TemplateRenderer,
    EmailQueueService,
    EmailTrackerService,
    EmailCacheService,
  ],
})
export class EmailModule {}
