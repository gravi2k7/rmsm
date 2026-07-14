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
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AccessTokenPayload } from "../auth/services/token.service";

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
  @ApiOperation({ operationId: "adminListEmailProviders", summary: "List platform-default email providers." })
  listEmailProviders(): Promise<EmailProvider[]> {
    return this.emailProviderRepository.findPlatformProviders();
  }

  @Post("providers/email")
  @RequirePermissions("notification.admin.manage")
  @ApiOperation({ operationId: "adminCreateEmailProvider", summary: "Register a platform-default email provider. `credentials` is a provider-specific object, encrypted before storage." })
  createEmailProvider(
    @Body() body: CreateEmailProviderDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<EmailProvider> {
    return this.emailProviderRepository.create({
      type: body.type,
      name: body.name,
      fromAddress: body.fromAddress,
      fromName: body.fromName,
      credentialsEnc: this.encryption.encrypt(body.credentials),
      createdById: user.sub,
    });
  }

  @Get("providers/sms")
  @RequirePermissions("notification.admin.manage")
  @ApiOperation({ operationId: "adminListSmsProviders", summary: "List platform-default SMS providers." })
  listSmsProviders(): Promise<SmsProvider[]> {
    return this.smsProviderRepository.findPlatformProviders();
  }

  @Post("providers/sms")
  @RequirePermissions("notification.admin.manage")
  @ApiOperation({ operationId: "adminCreateSmsProvider", summary: "Register a platform-default SMS provider." })
  createSmsProvider(
    @Body() body: CreateSmsProviderDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<SmsProvider> {
    return this.smsProviderRepository.create({
      type: body.type,
      name: body.name,
      fromNumber: body.fromNumber,
      credentialsEnc: this.encryption.encrypt(body.credentials),
      createdById: user.sub,
    });
  }

  @Get("providers/push")
  @RequirePermissions("notification.admin.manage")
  @ApiOperation({ operationId: "adminListPushProviders", summary: "List platform-default push providers." })
  listPushProviders(): Promise<PushProvider[]> {
    return this.pushProviderRepository.findPlatformProviders();
  }

  @Post("providers/push")
  @RequirePermissions("notification.admin.manage")
  @ApiOperation({ operationId: "adminCreatePushProvider", summary: "Register a platform-default push provider." })
  createPushProvider(
    @Body() body: CreatePushProviderDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<PushProvider> {
    return this.pushProviderRepository.create({
      type: body.type,
      name: body.name,
      credentialsEnc: this.encryption.encrypt(body.credentials),
      createdById: user.sub,
    });
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
}
