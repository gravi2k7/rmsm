import type { TokenUsage } from "./token-usage.entity";

export interface AIResponse {
  readonly requestId: string;
  readonly content: string;
  readonly tokenUsage: TokenUsage;
  readonly occurredAt: Date;
}
