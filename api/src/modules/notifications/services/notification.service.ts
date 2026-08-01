import { Injectable } from "@nestjs/common";
import { trace } from "@opentelemetry/api";
import { ConflictError, NotFoundError, ValidationError } from "@rmsm/shared";
import { Notification, NotificationType, NotificationChannel } from "@rmsm/database";
import { AuditService, AuditContext } from "../../auth/services/audit.service";
import { DomainEventPublisher } from "../../../common/events/domain-event-publisher.service";
import { MOD005_EVENTS } from "../../../common/events/mod005-events";
import { UserRepository } from "../../auth/repositories/user.repository";
import { NotificationRepository, NotificationListFilters, PageParams } from "../repositories/notification.repository";
import { TemplateService } from "./template.service";
import { PreferenceService } from "./preference.service";
import { QueueService } from "./queue.service";
import { EmailService } from "./email.service";
import { SmsService } from "./sms.service";
import { PushService } from "./push.service";

export interface SendNotificationInput {
  organizationId: string;
  type: NotificationType;
  channel: NotificationChannel;
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  categoryId?: string;
  templateKey?: string;
  recipientUserId?: string;
  recipientRole?: string;
  recipientPermission?: string;
  topic?: string;
  subject?: string;
  body?: string;
  variables?: Record<string, unknown>;
  locale?: string;
  scheduledFor?: Date;
  /** Null for system-initiated sends (a fired schedule, a digest) — never a fake string like "system", which would violate AuditLog.userId's real FK to User. See NotificationScheduler/DigestService, both of which pass null here for exactly this reason. */
  actorId: string | null;
}

/**
 * The orchestration service every future controller endpoint calls —
 * resolves content (template render or direct subject/body), checks
 * PreferenceService before proceeding, and either dispatches immediately
 * (via the relevant channel service) or enqueues for later
 * (QueueService), depending on whether `scheduledFor` is set. Mirrors the
 * "controller → service → provider registry" shape Module 004 established
 * for billing, extended here for a fan-out (one Notification can have
 * many NotificationDelivery rows across retries/providers) rather than a
 * strict 1:1 flow.
 */
@Injectable()
export class NotificationService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly templateService: TemplateService,
    private readonly preferenceService: PreferenceService,
    private readonly queueService: QueueService,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
    private readonly pushService: PushService,
    private readonly userRepository: UserRepository,
    private readonly auditService: AuditService,
    private readonly eventPublisher: DomainEventPublisher,
  ) {}

  async send(input: SendNotificationInput, ctx: AuditContext = {}): Promise<Notification> {
    this.validateRecipientShape(input);

    let subject = input.subject;
    let body = input.body;
    if (input.templateKey) {
      const rendered = await this.templateService.render(
        input.organizationId,
        input.templateKey,
        input.locale ?? "en",
        input.variables ?? {},
      );
      subject = rendered.subject ?? subject;
      body = rendered.body;
    }
    if (!body) {
      throw new ValidationError("A notification needs either a templateKey or an explicit body.");
    }

    if (input.recipientUserId) {
      const decision = await this.preferenceService.isAllowed(
        input.recipientUserId,
        input.organizationId,
        input.categoryId,
        input.channel,
      );
      if (!decision.allowed) {
        const cancelled = await this.notificationRepository.create({
          organizationId: input.organizationId,
          type: input.type,
          channel: input.channel,
          priority: input.priority,
          categoryId: input.categoryId,
          recipientUserId: input.recipientUserId,
          subject,
          body,
          locale: input.locale,
          // Recorded so DigestService can precisely distinguish "this was
          // redirected to a digest" from "this was genuinely opted out" —
          // both currently share NotificationStatus.CANCELLED (no
          // separate status exists in Phase 1's schema for this), so the
          // distinction has to live somewhere queryable; the existing
          // `data` JSON column is that place rather than a new column for
          // one boolean.
          data: { suppressionReason: decision.reason },
          createdById: input.actorId,
        });
        await this.notificationRepository.updateStatus(cancelled.id, "CANCELLED");
        await this.auditService.log("notification.suppressed", {
          userId: input.actorId,
          entityType: "Notification",
          entityId: cancelled.id,
          metadata: { reason: decision.reason },
          ...ctx,
        });
        return cancelled;
      }
    }

    const notification = await this.notificationRepository.create({
      organizationId: input.organizationId,
      type: input.type,
      channel: input.channel,
      priority: input.priority,
      categoryId: input.categoryId,
      templateId: undefined,
      recipientUserId: input.recipientUserId,
      recipientRole: input.recipientRole as never,
      recipientPermission: input.recipientPermission,
      topic: input.topic,
      subject,
      body,
      data: input.variables,
      locale: input.locale,
      scheduledFor: input.scheduledFor,
      createdById: input.actorId,
    });

    if (input.scheduledFor && input.scheduledFor > new Date()) {
      await this.notificationRepository.updateStatus(notification.id, "QUEUED");
      await this.queueService.enqueue({
        notificationId: notification.id,
        queueName: this.queueNameFor(input.channel),
        priority: input.priority,
        scheduledFor: input.scheduledFor,
      });
    } else {
      await this.dispatch(notification);
    }

    await this.auditService.log("notification.sent", {
      userId: input.actorId,
      entityType: "Notification",
      entityId: notification.id,
      metadata: { type: input.type, channel: input.channel },
      ...ctx,
    });

    return this.notificationRepository.findById(notification.id) as Promise<Notification>;
  }

  async sendBulk(inputs: SendNotificationInput[], ctx: AuditContext = {}): Promise<Notification[]> {
    return Promise.all(inputs.map((input) => this.send(input, ctx)));
  }

  async schedule(input: SendNotificationInput & { scheduledFor: Date }, ctx: AuditContext = {}): Promise<Notification> {
    return this.send(input, ctx);
  }

  /** Called directly by NotificationScheduler/DigestService (both this phase) once they've resolved what to send — not routed back through send()'s scheduling branch, since a schedule/digest firing IS the "now" moment, not a future one. */
  async dispatch(notification: Notification): Promise<void> {
    const tracer = trace.getTracer("rmsm-notifications");
    return tracer.startActiveSpan("notification.dispatch", async (span) => {
      span.setAttribute("notification.id", notification.id);
      span.setAttribute("notification.channel", notification.channel);
      span.setAttribute("notification.type", notification.type);
      span.setAttribute("notification.organization_id", notification.organizationId);

      try {
        await this.dispatchInner(notification);
        span.setStatus({ code: 1 }); // OK
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: 2, message: error instanceof Error ? error.message : String(error) }); // ERROR
        throw error;
      } finally {
        span.end();
      }
    });
  }

  private async dispatchInner(notification: Notification): Promise<void> {
    await this.notificationRepository.updateStatus(notification.id, "SENDING");
    try {
      switch (notification.channel) {
        case "EMAIL": {
          const recipient = await this.resolveRecipient(notification.recipientUserId);
          await this.emailService.send(notification.organizationId, notification.id, {
            to: [recipient.email],
            subject: notification.subject ?? "",
            html: notification.body,
          });
          break;
        }
        case "SMS": {
          const recipient = await this.resolveRecipient(notification.recipientUserId);
          if (!recipient.phone) {
            throw new ValidationError(`User ${recipient.id} has no phone number on file — cannot dispatch SMS.`);
          }
          await this.smsService.send(notification.organizationId, notification.id, {
            to: recipient.phone,
            body: notification.body,
          });
          break;
        }
        case "PUSH":
          if (!notification.recipientUserId) throw new ValidationError("Push dispatch requires a resolved recipient.");
          await this.pushService.sendToUser(notification.organizationId, notification.id, notification.recipientUserId, {
            title: notification.subject ?? "",
            body: notification.body,
          });
          break;
        case "IN_APP":
          // In-app notifications need no dispatch — the Notification row
          // itself, readable via listForUser(), IS the delivery. No
          // NotificationDelivery row is created for this channel.
          break;
        case "WEBHOOK":
          // Outbound org webhook triggering is WebhookService.triggerForEvent(),
          // called by whatever domain event actually occurred (e.g.
          // "invoice.paid" from a future billing integration) — not
          // something NotificationService.send() itself initiates, since
          // a webhook notification IS the event trigger, not a
          // recipient-addressed message. Flagged as an intentional
          // no-op here, not a missing case.
          break;
      }
      await this.notificationRepository.updateStatus(notification.id, "SENT");
      await this.eventPublisher.publish(MOD005_EVENTS.NOTIFICATION_SENT, {
        notificationId: notification.id,
        organizationId: notification.organizationId,
        channel: notification.channel,
        type: notification.type,
      });
    } catch (error) {
      await this.notificationRepository.updateStatus(notification.id, "FAILED");
      await this.eventPublisher.publish(MOD005_EVENTS.NOTIFICATION_FAILED, {
        notificationId: notification.id,
        organizationId: notification.organizationId,
        channel: notification.channel,
        type: notification.type,
        reason: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /** BROADCAST/ROLE/PERMISSION/TOPIC notifications don't have a single recipientUserId to resolve — multi-recipient fan-out for those types is a real, named gap (Phase 2c doc, Known Gaps), not implemented this phase. This resolves the DIRECT case only, which is what EMAIL/SMS dispatch above actually needs today. */
  private async resolveRecipient(recipientUserId: string | null): Promise<{ id: string; email: string; phone: string | null }> {
    if (!recipientUserId) {
      throw new ValidationError("This channel requires a resolved recipientUserId — multi-recipient fan-out (BROADCAST/ROLE/PERMISSION/TOPIC) is not implemented this phase.");
    }
    const user = await this.userRepository.findById(recipientUserId);
    if (!user) throw new NotFoundError("User", recipientUserId);
    return { id: user.id, email: user.email, phone: user.profile?.phone ?? null };
  }

  async getById(organizationId: string, id: string): Promise<Notification> {
    const notification = await this.notificationRepository.findById(id);
    if (!notification || notification.organizationId !== organizationId) {
      throw new NotFoundError("Notification", id);
    }
    return notification;
  }

  async listForUser(
    userId: string,
    organizationId: string,
    filters: NotificationListFilters,
    page: PageParams,
  ): Promise<{ items: Notification[]; total: number }> {
    const [items, total] = await Promise.all([
      this.notificationRepository.findByRecipient(userId, organizationId, filters, page),
      this.notificationRepository.countByRecipient(userId, organizationId, filters),
    ]);
    return { items, total };
  }

  async markRead(organizationId: string, id: string, userId: string): Promise<Notification> {
    const notification = await this.getById(organizationId, id);
    if (notification.recipientUserId !== userId) throw new NotFoundError("Notification", id);
    return this.notificationRepository.markRead(id);
  }

  async markArchived(organizationId: string, id: string, userId: string): Promise<Notification> {
    const notification = await this.getById(organizationId, id);
    if (notification.recipientUserId !== userId) throw new NotFoundError("Notification", id);
    return this.notificationRepository.markArchived(id);
  }

  async delete(organizationId: string, id: string, userId: string): Promise<void> {
    const notification = await this.getById(organizationId, id);
    if (notification.recipientUserId !== userId) throw new NotFoundError("Notification", id);
    await this.notificationRepository.softDelete(id);
  }

  private validateRecipientShape(input: SendNotificationInput): void {
    if (input.type === "DIRECT" && !input.recipientUserId) {
      throw new ValidationError("type=DIRECT requires recipientUserId.");
    }
    if (input.type === "ROLE" && !input.recipientRole) {
      throw new ValidationError("type=ROLE requires recipientRole.");
    }
    if (input.type === "PERMISSION" && !input.recipientPermission) {
      throw new ValidationError("type=PERMISSION requires recipientPermission.");
    }
    if (input.type === "TOPIC" && !input.topic) {
      throw new ValidationError("type=TOPIC requires topic.");
    }
    if (input.type === "BROADCAST" && (input.recipientUserId || input.recipientRole)) {
      throw new ConflictError("type=BROADCAST does not take a specific recipient.");
    }
  }

  private queueNameFor(channel: NotificationChannel): string {
    switch (channel) {
      case "EMAIL":
        return "email";
      case "SMS":
        return "sms";
      case "PUSH":
        return "push";
      default:
        return "scheduled";
    }
  }
}
