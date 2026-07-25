import { describe, it, expect, beforeEach } from "vitest";
import { ConversationService } from "../services/conversation.service";
import { ConversationNotFoundError, DuplicateConversationError } from "../../domain/errors/memory-domain.errors";
import { MessageRole } from "../../domain/enums/memory-type.enum";
import { FakeConversationRepository, RecordingEventPublisher, FixedClock, SequentialIdGenerator } from "./fakes";

describe("ConversationService", () => {
  let repository: FakeConversationRepository;
  let events: RecordingEventPublisher;
  let service: ConversationService;
  const now = new Date("2026-01-01T00:00:00Z");

  beforeEach(() => {
    repository = new FakeConversationRepository();
    events = new RecordingEventPublisher();
    service = new ConversationService(repository, events, new FixedClock(now), new SequentialIdGenerator());
  });

  it("start() persists a new conversation and publishes ConversationStarted", async () => {
    const conversation = await service.start("conv-1", "org-1");
    expect(conversation.id).toBe("conv-1");
    expect(await repository.findById("conv-1")).toBe(conversation);
    expect(events.published).toHaveLength(1);
    expect(events.published[0]).toMatchObject({ kind: "ConversationStarted", conversationId: "conv-1" });
  });

  it("start() rejects a conversation id that already exists", async () => {
    await service.start("conv-1");
    await expect(service.start("conv-1")).rejects.toBeInstanceOf(DuplicateConversationError);
  });

  it("addMessage() appends a turn and publishes ConversationUpdated", async () => {
    await service.start("conv-1");
    events.published.length = 0;

    const message = await service.addMessage("conv-1", MessageRole.USER, "Hello there");

    expect(message.conversationId).toBe("conv-1");
    expect(message.role).toBe(MessageRole.USER);
    expect(events.published).toHaveLength(1);
    expect(events.published[0]).toMatchObject({ kind: "ConversationUpdated", conversationId: "conv-1" });

    const messages = await service.getMessages("conv-1");
    expect(messages).toHaveLength(1);
  });

  it("addMessage() throws ConversationNotFoundError for an unknown conversation", async () => {
    await expect(service.addMessage("nope", MessageRole.USER, "hi")).rejects.toBeInstanceOf(ConversationNotFoundError);
  });

  it("getMessages() throws ConversationNotFoundError for an unknown conversation", async () => {
    await expect(service.getMessages("nope")).rejects.toBeInstanceOf(ConversationNotFoundError);
  });
});
