import { EmailTrackerService } from "../tracking/email-tracker.service";

describe("EmailTrackerService", () => {
  it("recordSent() stores a SENT record with retryCount and processingTimeMs", () => {
    const tracker = new EmailTrackerService();

    tracker.recordSent("msg-1", "SMTP", 2, 150);

    const record = tracker.get("msg-1");
    expect(record).toMatchObject({ messageId: "msg-1", provider: "SMTP", status: "SENT", retryCount: 2, processingTimeMs: 150 });
    expect(record?.sentAt).toBeInstanceOf(Date);
  });

  it("recordFailed() stores a FAILED record with the error message", () => {
    const tracker = new EmailTrackerService();

    tracker.recordFailed("msg-2", "RESEND", 5, 300, "provider unavailable");

    const record = tracker.get("msg-2");
    expect(record).toMatchObject({ status: "FAILED", error: "provider unavailable", retryCount: 5 });
    expect(record?.failedAt).toBeInstanceOf(Date);
  });

  it("markDelivered() upgrades a SENT record to DELIVERED", () => {
    const tracker = new EmailTrackerService();
    tracker.recordSent("msg-1", "SMTP", 0, 100);

    tracker.markDelivered("msg-1");

    expect(tracker.get("msg-1")?.status).toBe("DELIVERED");
  });

  it("markDelivered() is a no-op for an untracked message id", () => {
    const tracker = new EmailTrackerService();
    expect(() => tracker.markDelivered("unknown")).not.toThrow();
  });

  it("listAll() returns every tracked record", () => {
    const tracker = new EmailTrackerService();
    tracker.recordSent("a", "SMTP", 0, 10);
    tracker.recordFailed("b", "RESEND", 1, 20, "err");

    expect(tracker.listAll()).toHaveLength(2);
  });

  it("recentFailureRate() is 0 when there are no records", () => {
    expect(new EmailTrackerService().recentFailureRate()).toBe(0);
  });

  it("recentFailureRate() computes the fraction of failures within the sample window", () => {
    const tracker = new EmailTrackerService();
    tracker.recordSent("a", "SMTP", 0, 10);
    tracker.recordFailed("b", "SMTP", 0, 10, "err");
    tracker.recordFailed("c", "SMTP", 0, 10, "err");
    tracker.recordSent("d", "SMTP", 0, 10);

    expect(tracker.recentFailureRate()).toBe(0.5);
  });
});
