import { QueueEventTracker } from "../queue-event-tracker.service";
import type { QueueService } from "../queue.service";
import type { NotificationRepository } from "../../repositories/notification.repository";
import type { AuditService } from "../../../auth/services/audit.service";
import type { NotificationMetricsService } from "../notification-metrics.service";
import type { Job } from "bullmq";

describe("QueueEventTracker", () => {
  function buildTracker() {
    const queueService = {
      markCompleted: jest.fn(),
      recordRetryAttempt: jest.fn(),
      moveToDeadLetter: jest.fn(),
    } as unknown as jest.Mocked<QueueService>;
    const notificationRepository = {
      updateStatus: jest.fn(),
    } as unknown as jest.Mocked<NotificationRepository>;
    const auditService = { log: jest.fn() } as unknown as jest.Mocked<AuditService>;
    const metrics = { increment: jest.fn(), snapshot: jest.fn() } as unknown as jest.Mocked<NotificationMetricsService>;

    const tracker = new QueueEventTracker(queueService, notificationRepository, auditService, metrics);
    return { tracker, queueService, notificationRepository, auditService, metrics };
  }

  function fakeJob(overrides: Partial<Job> = {}): Job {
    return {
      id: "job1",
      name: "notification",
      data: { notificationId: "notif1" },
      opts: { attempts: 3 },
      attemptsMade: 1,
      ...overrides,
    } as Job;
  }

  describe("handleCompleted", () => {
    it("marks the queue entry completed for a 'notification' job", async () => {
      const { tracker, queueService, metrics } = buildTracker();
      await tracker.handleCompleted(fakeJob(), "email");
      expect(queueService.markCompleted).toHaveBeenCalledWith("job1");
      expect(metrics.increment).toHaveBeenCalledWith("queue.email.completed");
    });

    it("ignores non-'notification' jobs (e.g. sweep jobs)", async () => {
      const { tracker, queueService } = buildTracker();
      await tracker.handleCompleted(fakeJob({ name: "sweep-schedules" }), "scheduled");
      expect(queueService.markCompleted).not.toHaveBeenCalled();
    });
  });

  describe("handleFailed", () => {
    it("records a retry attempt (not dead-letter) when attempts remain", async () => {
      const { tracker, queueService, metrics } = buildTracker();
      await tracker.handleFailed(fakeJob({ attemptsMade: 1, opts: { attempts: 3 } }), "email", new Error("SMTP timeout"));
      expect(queueService.recordRetryAttempt).toHaveBeenCalledWith("job1", "SMTP timeout");
      expect(queueService.moveToDeadLetter).not.toHaveBeenCalled();
      expect(metrics.increment).toHaveBeenCalledWith("queue.email.retried");
    });

    it("moves to dead-letter and marks the notification FAILED on the final exhausted attempt", async () => {
      const { tracker, queueService, notificationRepository, auditService, metrics } = buildTracker();
      await tracker.handleFailed(fakeJob({ attemptsMade: 3, opts: { attempts: 3 } }), "email", new Error("permanent failure"));

      expect(queueService.moveToDeadLetter).toHaveBeenCalledWith("job1", "email", "permanent failure");
      expect(queueService.recordRetryAttempt).not.toHaveBeenCalled();
      expect(notificationRepository.updateStatus).toHaveBeenCalledWith("notif1", "FAILED");
      expect(auditService.log).toHaveBeenCalledWith(
        "notification.queue.dead_lettered",
        expect.objectContaining({ entityId: "job1" }),
      );
      expect(metrics.increment).toHaveBeenCalledWith("queue.email.dead_lettered");
    });

    it("treats attemptsMade exceeding the configured max as final too (defensive, not just equal)", async () => {
      const { tracker, queueService } = buildTracker();
      await tracker.handleFailed(fakeJob({ attemptsMade: 5, opts: { attempts: 3 } }), "sms", new Error("x"));
      expect(queueService.moveToDeadLetter).toHaveBeenCalled();
    });

    it("defaults maxAttempts to 5 when the job has no attempts option set", async () => {
      const { tracker, queueService } = buildTracker();
      await tracker.handleFailed(fakeJob({ attemptsMade: 4, opts: {} }), "push", new Error("x"));
      expect(queueService.recordRetryAttempt).toHaveBeenCalled(); // 4 < default 5
      expect(queueService.moveToDeadLetter).not.toHaveBeenCalled();
    });

    it("does nothing when job is undefined", async () => {
      const { tracker, queueService } = buildTracker();
      await tracker.handleFailed(undefined, "email", new Error("x"));
      expect(queueService.moveToDeadLetter).not.toHaveBeenCalled();
      expect(queueService.recordRetryAttempt).not.toHaveBeenCalled();
    });

    it("ignores non-'notification' jobs", async () => {
      const { tracker, queueService } = buildTracker();
      await tracker.handleFailed(fakeJob({ name: "sweep-digests" }), "digest", new Error("x"));
      expect(queueService.moveToDeadLetter).not.toHaveBeenCalled();
      expect(queueService.recordRetryAttempt).not.toHaveBeenCalled();
    });
  });
});
