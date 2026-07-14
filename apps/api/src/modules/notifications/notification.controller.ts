import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Notification, NotificationSchedule } from "@rmsm/database";
import { NotificationService } from "./services/notification.service";
import { NotificationScheduler } from "./services/notification-scheduler.service";
import { SendNotificationDto } from "./dto/send-notification.dto";
import { BulkSendNotificationDto } from "./dto/bulk-send-notification.dto";
import { ScheduleNotificationDto } from "./dto/schedule-notification.dto";
import { NotificationListQueryDto } from "./dto/notification-list-query.dto";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { RequireOrgRole } from "../organizations/decorators/require-org-role.decorator";
import { OrganizationRoleGuard } from "../organizations/guards/organization-role.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AccessTokenPayload } from "../auth/services/token.service";
import { NOTIFICATION_SEND_ROLES, NOTIFICATION_READ_ROLES } from "./constants";

/**
 * Send/list/read-state endpoints, matching the original Module 005
 * prompt's API Endpoints section exactly (POST send/bulk/schedule, GET
 * list/:id, PATCH read/archive, DELETE :id). Nested under
 * `notifications/organizations/:organizationId`, the same route shape
 * every organization-scoped controller in this project has used since
 * Module 003 — reusing `OrganizationRoleGuard` unmodified.
 *
 * Rate limiting: send/bulk/schedule use a tighter `@Throttle()` override
 * than the platform default (Module 001's global ThrottlerModule) —
 * bulk-notification abuse is a real, specific concern for this module
 * that the platform-wide default isn't tuned for, per the Phase 2c
 * Developer Guide's note.
 */
@ApiTags("Notifications")
@ApiBearerAuth()
@UseGuards(PermissionsGuard, OrganizationRoleGuard)
@Controller("notifications/organizations/:organizationId")
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly notificationScheduler: NotificationScheduler,
  ) {}

  @Post("send")
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @RequirePermissions("notification.send")
  @RequireOrgRole(...NOTIFICATION_SEND_ROLES)
  @ApiOperation({ operationId: "sendNotification", summary: "Send a notification immediately." })
  send(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Body() dto: SendNotificationDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<Notification> {
    return this.notificationService.send({
      organizationId,
      type: dto.type,
      channel: dto.channel,
      priority: dto.priority,
      categoryId: dto.categoryId,
      templateKey: dto.templateKey,
      recipientUserId: dto.recipientUserId,
      recipientRole: dto.recipientRole,
      recipientPermission: dto.recipientPermission,
      topic: dto.topic,
      subject: dto.subject,
      body: dto.body,
      variables: dto.variables,
      locale: dto.locale,
      scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : undefined,
      actorId: user.sub,
    });
  }

  @Post("bulk")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @RequirePermissions("notification.send")
  @RequireOrgRole(...NOTIFICATION_SEND_ROLES)
  @ApiOperation({ operationId: "sendBulkNotifications", summary: "Send up to 1000 notifications in one request." })
  sendBulk(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Body() dto: BulkSendNotificationDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<Notification[]> {
    return this.notificationService.sendBulk(
      dto.notifications.map((n) => ({
        organizationId,
        type: n.type,
        channel: n.channel,
        priority: n.priority,
        categoryId: n.categoryId,
        templateKey: n.templateKey,
        recipientUserId: n.recipientUserId,
        recipientRole: n.recipientRole,
        recipientPermission: n.recipientPermission,
        topic: n.topic,
        subject: n.subject,
        body: n.body,
        variables: n.variables,
        locale: n.locale,
        actorId: user.sub,
      })),
    );
  }

  @Post("schedule")
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @RequirePermissions("notification.send")
  @RequireOrgRole(...NOTIFICATION_SEND_ROLES)
  @ApiOperation({ operationId: "scheduleNotification", summary: "Create a recurring (or one-off) notification schedule from a template." })
  schedule(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Body() dto: ScheduleNotificationDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<NotificationSchedule> {
    // ScheduleNotificationDto's shape (templateId, frequency, targetType)
    // matches NotificationScheduler.createSchedule() (Phase 2c) — a
    // recurring rule that spawns Notification rows over time — not
    // NotificationService.send()'s one-off `scheduledFor` field, which is
    // for delaying a single already-composed notification. An earlier
    // draft of this endpoint called the wrong service with placeholder
    // values that would have failed immediately; fixed before this
    // shipped.
    return this.notificationScheduler.createSchedule(
      {
        organizationId,
        templateId: dto.templateId,
        frequency: dto.frequency,
        cronExpression: dto.cronExpression,
        nextRunAt: new Date(dto.nextRunAt),
        targetType: dto.targetType,
        targetValue: dto.targetValue,
      },
      user.sub,
    );
  }

  @Get()
  @RequirePermissions("notification.read")
  @RequireOrgRole(...NOTIFICATION_READ_ROLES)
  @ApiOperation({ operationId: "listNotifications", summary: "List the caller's own notifications in this organization." })
  list(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Query() query: NotificationListQueryDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<{ items: Notification[]; total: number }> {
    return this.notificationService.listForUser(
      user.sub,
      organizationId,
      { status: query.status },
      { take: query.take, skip: query.skip },
    );
  }

  @Get(":id")
  @RequirePermissions("notification.read")
  @RequireOrgRole(...NOTIFICATION_READ_ROLES)
  @ApiOperation({ operationId: "getNotification", summary: "Get a single notification." })
  get(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<Notification> {
    return this.notificationService.getById(organizationId, id);
  }

  @Patch(":id/read")
  @RequirePermissions("notification.read")
  @RequireOrgRole(...NOTIFICATION_READ_ROLES)
  @ApiOperation({ operationId: "markNotificationRead", summary: "Mark a notification read." })
  markRead(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<Notification> {
    return this.notificationService.markRead(organizationId, id, user.sub);
  }

  @Patch(":id/archive")
  @RequirePermissions("notification.read")
  @RequireOrgRole(...NOTIFICATION_READ_ROLES)
  @ApiOperation({ operationId: "archiveNotification", summary: "Archive a notification." })
  archive(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<Notification> {
    return this.notificationService.markArchived(organizationId, id, user.sub);
  }

  @Delete(":id")
  @RequirePermissions("notification.read")
  @RequireOrgRole(...NOTIFICATION_READ_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ operationId: "deleteNotification", summary: "Soft-delete a notification." })
  delete(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<void> {
    return this.notificationService.delete(organizationId, id, user.sub);
  }
}
