import type { AIRequest } from "../domain/entities/ai-request.entity";
import type { AIResponse } from "../domain/entities/ai-response.entity";
import type { PromptTrace } from "../domain/entities/prompt-trace.entity";
import type { MemoryTrace } from "../domain/entities/memory-trace.entity";
import type { ProviderTrace } from "../domain/entities/provider-trace.entity";

/**
 * Persistence port for the request-lifecycle trace records
 * `TracingService` builds up. One port covering all five trace-shaped
 * entities (rather than five separate repositories) because they are
 * always written and read together, keyed by the same `requestId` —
 * splitting them would just force every caller to coordinate five
 * repositories instead of one.
 */
export interface TraceRepository {
  saveRequest(request: AIRequest): Promise<void>;
  findRequestById(requestId: string): Promise<AIRequest | null>;
  saveResponse(response: AIResponse): Promise<void>;
  savePromptTrace(trace: PromptTrace): Promise<void>;
  saveMemoryTrace(trace: MemoryTrace): Promise<void>;
  saveProviderTrace(trace: ProviderTrace): Promise<void>;
  findProviderTracesByRequestId(requestId: string): Promise<readonly ProviderTrace[]>;
}
