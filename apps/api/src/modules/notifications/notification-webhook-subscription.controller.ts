import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ValidationError } from "@rmsm/shared";
import type { NotificationWebhook } from "@rmsm/database";
import { NotificationWebhookRepository } from "./repositories/notification-webhook.repository";
import { CredentialEncryptionService } from "./providers/shared/credential-encryption";
import { CreateNotificationWebhookDto } from "./dto/create-notification-webhook.dto";
import { assertSafeWebhookUrl } from "./providers/shared/ssrf-guard";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { RequireOrgRole } from "../organizations/decorators/require-org-role.decorator";
import { OrganizationRoleGuard } from "../organizations/guards/organization-role.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AccessTokenPayload } from "../auth/services/token.service";
import { randomBytes } from "crypto";

/**
 * Manages OUTBOUND webhook subscriptions (WebhookService.triggerForEvent's
 * targets, Phase 2c) — the DTO for this existed since Phase 1 but had no
 * controller endpoint until this phase's security review surfaced the
 * gap while checking SSRF coverage. Every URL is validated with
 * `assertSafeWebhookUrl` (this phase) before the subscription is ever
 * stored — the earliest point to reject an unsafe target, before
 * `WebhookService` ever fetches it.
 */
@ApiTags("Notification Webhook Subscriptions")
@ApiBearerAuth()
@UseGuards(PermissionsGuard, OrganizationRoleGuard)
@Controller("notifications/organizations/:organizationId/webhook-subscriptions")
export class NotificationWebhookSubscriptionController {
  constructor(
    private readonly webhookRepository: NotificationWebhookRepository,
    private readonly encryption: CredentialEncryptionService,
  ) {}

  @Post()
  @RequirePermissions("notification.admin.manage")
  @RequireOrgRole("OWNER", "ADMINISTRATOR")
  @ApiOperation({ operationId: "createWebhookSubscription", summary: "Register an outbound webhook. Returns the signing secret exactly once." })
  async create(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Body() dto: CreateNotificationWebhookDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<NotificationWebhook & { signingSecret: string }> {
    try {
      await assertSafeWebhookUrl(dto.url);
    } catch (error) {
      throw new ValidationError(error instanceof Error ? error.message : "Invalid webhook URL.");
    }

    const signingSecret = randomBytes(32).toString("hex");
    const webhook = await this.webhookRepository.create({
      organizationId,
      url: dto.url,
      secretEnc: this.encryption.encrypt({ secret: signingSecret }),
      eventTypes: dto.eventTypes,
      createdById: user.sub,
    });
    // The signing secret is returned exactly once, at creation — it's
    // encrypted at rest immediately after and never appears in any GET
    // response, matching this project's "credentials are write-once,
    // never re-displayed" convention (Module 002's OAuth client secrets,
    // Module 004's payment provider credentials).
    return { ...webhook, signingSecret };
  }

  @Get()
  @RequirePermissions("notification.admin.manage")
  @RequireOrgRole("OWNER", "ADMINISTRATOR")
  @ApiOperation({ operationId: "listWebhookSubscriptions", summary: "List this organization's outbound webhook subscriptions (signing secrets never included)." })
  async list(@Param("organizationId", ParseUUIDPipe) organizationId: string): Promise<Omit<NotificationWebhook, "secretEnc">[]> {
    const rows = await this.webhookRepository.findByOrganization(organizationId);
    return rows.map(({ secretEnc: _secretEnc, ...rest }) => rest);
  }

  @Delete(":id")
  @RequirePermissions("notification.admin.manage")
  @RequireOrgRole("OWNER", "ADMINISTRATOR")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ operationId: "deleteWebhookSubscription", summary: "Deactivate an outbound webhook subscription." })
  async delete(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    await this.webhookRepository.softDelete(id);
  }
}
