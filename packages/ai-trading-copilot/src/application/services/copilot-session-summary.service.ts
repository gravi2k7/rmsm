import type { Clock, IdGenerator } from "@rmsm/core";
import { ConversationService, MemoryType, MessageRole } from "@rmsm/ai-memory";
import type { MemoryService } from "@rmsm/ai-memory";
import type { CopilotSessionSummary } from "../../domain/entities/copilot-session-summary.entity";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { CopilotQuestionAnsweredEvent } from "../../events/trading-copilot-domain-events.interface";

/**
 * The flagship composing service — reads a REAL, unmodified
 * `@rmsm/ai-memory` (AI-203) `ConversationService.getMessages()` result
 * (never re-implements conversation storage) and turns it into one
 * session-level narrative. When a `MemoryService` is injected, the
 * summary is ALSO stored as a `MemoryType.SEMANTIC` entry, same as
 * every other AI-6xx package's own flagship report.
 */
export class CopilotSessionSummaryService {
  constructor(
    private readonly conversationService: ConversationService,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly eventPublisher?: EventPublisher,
    private readonly memoryService?: MemoryService,
  ) {}

  async generate(sessionId: string, intent: string): Promise<CopilotSessionSummary> {
    const messages = await this.conversationService.getMessages(sessionId);
    const turnCount = messages.filter((m) => m.role === MessageRole.USER).length;
    const narrative = `Session ${sessionId} has ${turnCount} user turn(s) and ${messages.length} total message(s).`;
    const now = this.clock.now();

    const summary: CopilotSessionSummary = { sessionId, turnCount, narrative, generatedAt: now };

    if (this.memoryService) {
      await this.memoryService.store({
        type: MemoryType.SEMANTIC,
        conversationId: sessionId,
        content: narrative,
        metadata: { tags: ["trading-copilot", sessionId], source: "ai-trading-copilot", author: "CopilotSessionSummaryService" },
      });
    }

    if (this.eventPublisher) {
      const event: CopilotQuestionAnsweredEvent = {
        eventId: this.idGenerator.generate(),
        kind: "CopilotQuestionAnswered",
        occurredAt: now,
        aggregateId: sessionId,
        sessionId,
        intent,
      };
      await this.eventPublisher.publish([event]);
    }

    return summary;
  }
}
