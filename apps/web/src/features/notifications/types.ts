export type NotificationPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
export type NotificationStatus = "PENDING" | "QUEUED" | "SENDING" | "SENT" | "DELIVERED" | "FAILED" | "BOUNCED" | "READ" | "ARCHIVED" | "CANCELLED";
export type NotificationChannel = "EMAIL" | "SMS" | "PUSH" | "IN_APP" | "WEBHOOK";
export type NotificationType = "DIRECT" | "BROADCAST" | "ROLE" | "PERMISSION" | "TOPIC" | "DIGEST";

export interface Notification {
  id: string;
  organizationId: string;
  type: NotificationType;
  channel: NotificationChannel;
  priority: NotificationPriority;
  status: NotificationStatus;
  categoryId: string | null;
  subject: string | null;
  body: string;
  data: Record<string, unknown>;
  readAt: string | null;
  archivedAt: string | null;
  createdAt: string;
}
