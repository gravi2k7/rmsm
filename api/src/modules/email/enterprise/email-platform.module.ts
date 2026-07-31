import type { Provider } from "@nestjs/common";
import type { Env } from "@rmsm/config";
import { APP_CONFIG } from "../../../config/app-config.module";
import { EmailProviderRegistry } from "./providers/email-provider.registry";
import { EmailProviderFactory } from "./providers/email-provider.factory";
import { EmailRetryService } from "./retry/email-retry.service";
import { EmailTrackerService } from "./tracking/email-tracker.service";
import { EmailErrorMapper } from "./errors/email-error-mapper";
import { EmailQueueService } from "./queue/email-queue.service";
import { EmailCacheService } from "./cache/email-cache.service";
import { EmailHealthProvider } from "./health/email-health.provider";
import { EmailAdminService } from "./admin/email-admin.service";
import { TemplateEngine } from "./template-engine/template-engine";
import { TemplateRenderer } from "./template-engine/template-renderer";
import { TemplateRegistry } from "./template-engine/template-registry";
import { EnterpriseEmailService } from "./enterprise-email.service";

/**
 * Every provider the Enterprise Email Platform registers into
 * `EmailModule`'s own (already `@Global()`) provider array — kept as a
 * plain, spreadable array rather than its own `@Module()` since
 * `EmailModule` needs all of these in its one global scope anyway (a
 * nested, separately-imported child module would just add an extra
 * layer with no isolation benefit here, unlike e.g. `BrokerModule`,
 * which is deliberately its own non-global module).
 *
 * EM-001's own Configuration rule ("No direct process.env") applied to
 * DI: `EmailQueueService`'s constructor needs two primitive numbers
 * (`maxRetries`/`retryDelayMs`) Nest can't inject as tokens on their
 * own, so a `useFactory` provider reads them from the already-validated
 * `Env` (via `APP_CONFIG`) — the same primitive-constructor-argument
 * problem `MetaTrader5RegistrarService` (BR-001) solved with a
 * hand-written registrar; expressed here as a factory provider instead
 * since `EmailQueueService` (unlike `MetaTrader5Provider`) is itself a
 * real `@Injectable()` other providers in this array depend on via
 * ordinary constructor injection.
 */
export const EMAIL_PLATFORM_PROVIDERS: Provider[] = [
  EmailProviderRegistry,
  EmailProviderFactory,
  EmailRetryService,
  EmailTrackerService,
  EmailErrorMapper,
  EmailCacheService,
  TemplateEngine,
  TemplateRenderer,
  TemplateRegistry,
  {
    provide: EmailQueueService,
    useFactory: (registry: EmailProviderRegistry, retry: EmailRetryService, tracker: EmailTrackerService, errorMapper: EmailErrorMapper, env: Env) =>
      new EmailQueueService(registry, retry, tracker, errorMapper, env.EMAIL_RETRY_COUNT, env.EMAIL_RETRY_DELAY_MS),
    inject: [EmailProviderRegistry, EmailRetryService, EmailTrackerService, EmailErrorMapper, APP_CONFIG],
  },
  EmailHealthProvider,
  EmailAdminService,
  EnterpriseEmailService,
];
