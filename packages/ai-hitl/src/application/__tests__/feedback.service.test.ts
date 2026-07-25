import { describe, expect, it } from "vitest";
import { FeedbackService } from "../services/feedback.service";
import { InMemoryFeedbackRepository } from "../../infrastructure/in-memory-feedback.repository";
import { FixedClock, SequentialIdGenerator, RecordingEventPublisher } from "./fakes";

describe("FeedbackService", () => {
  it("submits feedback for a subject and lists it back", async () => {
    const events = new RecordingEventPublisher();
    const service = new FeedbackService(new InMemoryFeedbackRepository(), new FixedClock(), new SequentialIdGenerator(), events);

    await service.submit("delegation-1", "agent-1", "reviewer-1", 4, "mostly good, missed one source");
    const feedback = await service.listForSubject("delegation-1");

    expect(feedback).toHaveLength(1);
    expect(feedback[0]?.rating).toBe(4);
    expect(events.published.map((e) => e.kind)).toEqual(["FeedbackSubmitted"]);
  });
});
