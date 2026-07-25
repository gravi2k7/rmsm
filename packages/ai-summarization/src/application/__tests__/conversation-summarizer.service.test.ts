import { describe, it, expect } from "vitest";
import { HeuristicSummarizer, MessageRole } from "@rmsm/ai-memory";
import type { ConversationMessage } from "@rmsm/ai-memory";
import { ConversationSummarizer } from "../services/conversation-summarizer.service";
import { EmptyContentError } from "../../domain/errors/summarization-domain.errors";
import { FixedClock, SequentialIdGenerator, RecordingEventPublisher } from "./fakes";

describe("ConversationSummarizer", () => {
  it("formats real @rmsm/ai-memory ConversationMessages into a transcript and summarizes it", async () => {
    const events = new RecordingEventPublisher();
    const summarizer = new ConversationSummarizer(new HeuristicSummarizer(), new FixedClock(new Date()), new SequentialIdGenerator(), events);

    const messages: readonly ConversationMessage[] = [
      { id: "m1", conversationId: "conv-1", role: MessageRole.USER, content: "What is the refund policy?", createdAt: new Date() },
      { id: "m2", conversationId: "conv-1", role: MessageRole.ASSISTANT, content: "Refunds are available within 30 days.", createdAt: new Date() },
    ];

    const summary = await summarizer.summarize(messages);

    expect(summary.length).toBeGreaterThan(0);
    expect(events.published.map((e) => e.kind)).toEqual(["ConversationSummarized"]);
    const event = events.published[0] as { messageCount: number };
    expect(event.messageCount).toBe(2);
  });

  it("throws EmptyContentError for an empty message list", async () => {
    const summarizer = new ConversationSummarizer(new HeuristicSummarizer(), new FixedClock(new Date()), new SequentialIdGenerator());
    await expect(summarizer.summarize([])).rejects.toThrow(EmptyContentError);
  });
});
