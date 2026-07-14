import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { EmailProvider, SmsProvider, PushProvider, NotificationQueue } from "@rmsm/database";
import { EmailProviderRepository } from "./repositories/email-provider.repository";
import { CreateEmailProviderDto } from "./dto/create-email-provider.dto";
import { CreateSmsProviderDto } from "./dto/create-sms-provider.dto";
import { CreatePushProviderDto } from "./dto/create-push-provider.dto";
import { SmsProviderRepository } from "./repositories/sms-provider.repository";
import { PushProviderRepository } from "./repositories/push-provider.repository";
import { NotificationQueueRepository } from "./repositories/notification-queue.repository";
import { QueueService } from "./services/queue.service";
import { NotificationMetricsService } from "./services/notification-metrics.service";
import { CredentialEncryptionService } from "./providers/shared/credential-encryption";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import { Public } from "../auth/decorators/public.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AccessTokenPayload } from "../auth/services/token.service";

type Redacted<T> = Omit<T, "credentialsEnc">;

/** Strips the encrypted credential blob from any provider row before it ever leaves this controller — added in this phase's security review. Even encrypted, returning ciphertext over the API is unnecessary exposed attack surface (trivial bulk access to every ciphertext if the encryption key were ever compromised) and was inconsistent with this project's own "credentials are write-once, never re-displayed" convention, applied everywhere else (Module 002's OAuth secrets, this phase's webhook signing secrets). Found and fixed on all 6 provider endpoints — 3 list, 3 create — not just the list ones. */
function redact<T extends { credentialsEnc: string }>({ credentialsEnc: _credentialsEnc, ...rest }: T): Redacted<T> {
  return rest as Redacted<T>;
}

/**
 * Platform-wide provider configuration — not organization-scoped, same
 * reasoning as Module 004's AdminBillingController (no
 * OrganizationRoleGuard, gated by platform permission alone). Registers
 * platform-default providers (organizationId = null rows); per-
 * organization provider configuration is a smaller, org-scoped surface
 * this phase doesn't expose a dedicated endpoint for — organizations use
 * the platform default until that's built, which is an intentional,
 * named scope boundary, not an oversight.
 */
@ApiTags("Notification Admin")
@ApiBearerAuth()
@Controller("notifications/admin")
export class AdminNotificationController {
  constructor(
    private readonly emailProviderRepository: EmailProviderRepository,
    private readonly smsProviderRepository: SmsProviderRepository,
    private readonly pushProviderRepository: PushProviderRepository,
    private readonly queueRepository: NotificationQueueRepository,
    private readonly queueService: QueueService,
    private readonly metrics: NotificationMetricsService,
    private readonly encryption: CredentialEncryptionService,
  ) {}

  @Get("providers/email")
  @RequirePermissions("notification.admin.manage")
  @ApiOperation({ operationId: "adminListEmailProviders", summary: "List platform-default email providers (credentials never included)." })
  async listEmailProviders(): Promise<Redacted<EmailProvider>[]> {
    const rows = await this.emailProviderRepository.findPlatformProviders();
    return rows.map(redact);
  }

  @Post("providers/email")
  @RequirePermissions("notification.admin.manage")
  @ApiOperation({ operationId: "adminCreateEmailProvider", summary: "Register a platform-default email provider. `credentials` is a provider-specific object, encrypted before storage and never returned." })
  async createEmailProvider(
    @Body() body: CreateEmailProviderDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<Redacted<EmailProvider>> {
    const row = await this.emailProviderRepository.create({
      type: body.type,
      name: body.name,
      fromAddress: body.fromAddress,
      fromName: body.fromName,
      credentialsEnc: this.encryption.encrypt(body.credentials),
      createdById: user.sub,
    });
    return redact(row);
  }

  @Get("providers/sms")
  @RequirePermissions("notification.admin.manage")
  @ApiOperation({ operationId: "adminListSmsProviders", summary: "List platform-default SMS providers (credentials never included)." })
  async listSmsProviders(): Promise<Redacted<SmsProvider>[]> {
    const rows = await this.smsProviderRepository.findPlatformProviders();
    return rows.map(redact);
  }

  @Post("providers/sms")
  @RequirePermissions("notification.admin.manage")
  @ApiOperation({ operationId: "adminCreateSmsProvider", summary: "Register a platform-default SMS provider." })
  async createSmsProvider(
    @Body() body: CreateSmsProviderDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<Redacted<SmsProvider>> {
    const row = await this.smsProviderRepository.create({
      type: body.type,
      name: body.name,
      fromNumber: body.fromNumber,
      credentialsEnc: this.encryption.encrypt(body.credentials),
      createdById: user.sub,
    });
    return redact(row);
  }

  @Get("providers/push")
  @RequirePermissions("notification.admin.manage")
  @ApiOperation({ operationId: "adminListPushProviders", summary: "List platform-default push providers (credentials never included)." })
  async listPushProviders(): Promise<Redacted<PushProvider>[]> {
    const rows = await this.pushProviderRepository.findPlatformProviders();
    return rows.map(redact);
  }

  @Post("providers/push")
  @RequirePermissions("notification.admin.manage")
  @ApiOperation({ operationId: "adminCreatePushProvider", summary: "Register a platform-default push provider." })
  async createPushProvider(
    @Body() body: CreatePushProviderDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<Redacted<PushProvider>> {
    const row = await this.pushProviderRepository.create({
      type: body.type,
      name: body.name,
      credentialsEnc: this.encryption.encrypt(body.credentials),
      createdById: user.sub,
    });
    return redact(row);
  }

  @Get("metrics")
  @RequirePermissions("notification.admin.manage")
  @ApiOperation({ operationId: "adminGetMetrics", summary: "In-memory delivery/queue counters for this running instance — not aggregated across multiple instances (see NotificationMetricsService's class comment)." })
  getMetrics(): Record<string, number> {
    return this.metrics.snapshot();
  }

  @Get("dead-letter/:queueName")
  @RequirePermissions("notification.admin.manage")
  @ApiOperation({ operationId: "adminListDeadLetter", summary: "List jobs that exhausted all retry attempts on a given queue." })
  listDeadLetter(@Param("queueName") queueName: string): Promise<NotificationQueue[]> {
    return this.queueRepository.findDeadLetter(queueName, 100);
  }

  @Post("dead-letter/:queueName/retry")
  @RequirePermissions("notification.admin.manage")
  @ApiOperation({ operationId: "adminRetryDeadLetter", summary: "Requeue every dead-lettered job on a queue for one more attempt." })
  async retryDeadLetter(@Param("queueName") queueName: string): Promise<{ retried: number }> {
    const retried = await this.queueService.retryFailed(queueName);
    return { retried };
  }

  @Get("health")
  @Public()
  @ApiOperation({
    operationId: "notificationsHealth",
    summary:
      "Module-specific health signal — dead-letter backlog per queue. Public (a liveness-style probe, not sensitive data): counts only, no job contents. Complements /health/ready (Module 001), which checks DB/Redis reachability but has no visibility into notification-specific backlog.",
  })
  async health(): Promise<{ status: "ok" | "degraded"; deadLetterCounts: Record<string, number> }> {
    const queueNames = ["email", "sms", "push", "scheduled"];
    const counts = await Promise.all(queueNames.map((name) => this.queueRepository.findDeadLetter(name, 1000)));
    const deadLetterCounts = Object.fromEntries(queueNames.map((name, i) => [name, counts[i]?.length ?? 0]));
    // Threshold is a judgment call, not a spec'd SLA — flagged as such;
    // whoever operates this should tune it against real traffic once
    // there is any.
    const degraded = Object.values(deadLetterCounts).some((count) => count > 50);
    return { status: degraded ? "degraded" : "ok", deadLetterCounts };
  }
}
