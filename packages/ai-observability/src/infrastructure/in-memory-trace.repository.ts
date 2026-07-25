import type { TraceRepository } from "../tracing/trace-repository.interface";
import type { AIRequest } from "../domain/entities/ai-request.entity";
import type { AIResponse } from "../domain/entities/ai-response.entity";
import type { PromptTrace } from "../domain/entities/prompt-trace.entity";
import type { MemoryTrace } from "../domain/entities/memory-trace.entity";
import type { ProviderTrace } from "../domain/entities/provider-trace.entity";

export class InMemoryTraceRepository implements TraceRepository {
  private readonly requests = new Map<string, AIRequest>();
  private readonly responses = new Map<string, AIResponse>();
  private readonly promptTraces: PromptTrace[] = [];
  private readonly memoryTraces: MemoryTrace[] = [];
  private readonly providerTraces: ProviderTrace[] = [];

  async saveRequest(request: AIRequest): Promise<void> {
    this.requests.set(request.id, request);
  }

  async findRequestById(requestId: string): Promise<AIRequest | null> {
    return this.requests.get(requestId) ?? null;
  }

  async saveResponse(response: AIResponse): Promise<void> {
    this.responses.set(response.requestId, response);
  }

  async savePromptTrace(trace: PromptTrace): Promise<void> {
    this.promptTraces.push(trace);
  }

  async saveMemoryTrace(trace: MemoryTrace): Promise<void> {
    this.memoryTraces.push(trace);
  }

  async saveProviderTrace(trace: ProviderTrace): Promise<void> {
    this.providerTraces.push(trace);
  }

  async findProviderTracesByRequestId(requestId: string): Promise<readonly ProviderTrace[]> {
    return this.providerTraces.filter((trace) => trace.requestId === requestId);
  }
}
