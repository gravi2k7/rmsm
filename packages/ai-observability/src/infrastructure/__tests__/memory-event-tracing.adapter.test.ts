import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryConversationProvider, ConversationService, MessageRole } from "@rmsm/ai-memory";
import { MemoryEventTracingAdapter } from "../memory-event-tracing.adapter";
import { AuditService } from "../../application/services/audit.service";
import { FixedClock, SequentialIdGenerator, makeAuditEntryRepository } from "../../application/__tests__/fakes";
import type { AuditEntryRepository } from "../../application/services/audit.service";

/**
 * The load-bearing test for the whole AI-203/AI-204 integration: proves
 * `MemoryEventTracingAdapter` (an AI-204 class) really observes a real,
 * unmodified `@rmsm/ai-memory` service via that package's own
 * `EventPublisher` port — with zero changes made to `@rmsm/ai-memory`
 * itself, and no import in the other direction.
 */
describe("MemoryEventTracingAdapter (AI-203 <-> AI-204 integration)", () => {
  let auditEntryRepository: AuditEntryRepository;
  let auditService: AuditService;
  let adapter: MemoryEventTracingAdapter;
  let conversationService: ConversationService;

  beforeEach(() => {
    auditEntryRepository = makeAuditEntryRepository();
    auditService = new AuditService(auditEntryRepository, new FixedClock(new Date("2026-01-01T00:00:00.000Z")), new SequentialIdGenerator());
    adapter = new MemoryEventTracingAdapter(auditService);

    conversationService = new ConversationService(new InMemoryConversationProvider(), adapter, new FixedClock(new Date("2026-01-01T00:00:00.000Z")), new SequentialIdGenerator());
  });

  it("audits a ConversationStarted event raised by a real ConversationService", async () => {
    const conversation = await conversationService.start("conv-1", "org-1");

    const history = await auditService.getHistory(conversation.id);
    expect(history.map((e) => e.action)).toContain("ConversationStarted");
  });

  it("audits a ConversationUpdated event when a message is added", async () => {
    const conversation = await conversationService.start("conv-1", "org-1");
    await conversationService.addMessage(conversation.id, MessageRole.USER, "hello");

    const history = await auditService.getHistory(conversation.id);
    expect(history.map((e) => e.action)).toContain("ConversationUpdated");
  });
});
