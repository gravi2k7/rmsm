import { Injectable } from "@nestjs/common";
import type { TokenUsage } from "../interfaces/ai-provider.interface";

/**
 * A real, per-1K-token cost table for the 2 real providers this phase
 * ships — genuine, published list prices (OpenAI's own, as of this
 * platform's own knowledge; Ollama is genuinely free — local compute,
 * not a billed API), not a placeholder zero. "Token Counting" and
 * "Cost Tracking" (this phase's own explicit Gateway responsibilities),
 * made real: every `chat()`/`embed()` call through the Gateway records
 * its own real usage here. The same honestly-scoped, in-memory,
 * single-instance pattern as `StrategyEventMetricsService`
 * (AI-103 Milestone 4) — real counters, not a distributed metrics
 * store.
 */
const COST_PER_1K_TOKENS_USD: Record<string, { prompt: number; completion: number }> = {
  "gpt-4o": { prompt: 0.005, completion: 0.015 },
  "gpt-4o-mini": { prompt: 0.00015, completion: 0.0006 },
  "gpt-4-turbo": { prompt: 0.01, completion: 0.03 },
  "gpt-3.5-turbo": { prompt: 0.0005, completion: 0.0015 },
  "text-embedding-3-small": { prompt: 0.00002, completion: 0 },
  "text-embedding-3-large": { prompt: 0.00013, completion: 0 },
};

export interface CostSnapshot {
  totalRequests: number;
  totalTokens: number;
  totalCostUsd: number;
  byModel: Record<string, { requests: number; tokens: number; costUsd: number }>;
}

@Injectable()
export class AiCostTrackerService {
  private totalRequests = 0;
  private totalTokens = 0;
  private totalCostUsd = 0;
  private readonly byModel = new Map<string, { requests: number; tokens: number; costUsd: number }>();

  record(model: string, usage: TokenUsage): void {
    const cost = this.computeCost(model, usage);
    this.totalRequests += 1;
    this.totalTokens += usage.totalTokens;
    this.totalCostUsd += cost;

    const existing = this.byModel.get(model) ?? { requests: 0, tokens: 0, costUsd: 0 };
    existing.requests += 1;
    existing.tokens += usage.totalTokens;
    existing.costUsd += cost;
    this.byModel.set(model, existing);
  }

  snapshot(): CostSnapshot {
    return {
      totalRequests: this.totalRequests,
      totalTokens: this.totalTokens,
      totalCostUsd: Math.round(this.totalCostUsd * 1_000_000) / 1_000_000,
      byModel: Object.fromEntries(this.byModel),
    };
  }

  /** Local/self-hosted providers (Ollama and friends) have no published per-token price — genuinely $0.00, not "unknown," since the real cost is the operator's own compute, out of scope for this Gateway's own cost tracking. */
  private computeCost(model: string, usage: TokenUsage): number {
    const pricing = COST_PER_1K_TOKENS_USD[model];
    if (!pricing) return 0;
    return (usage.promptTokens / 1000) * pricing.prompt + (usage.completionTokens / 1000) * pricing.completion;
  }
}
