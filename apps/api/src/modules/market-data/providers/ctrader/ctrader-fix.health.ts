import { Injectable } from "@nestjs/common";

import type {
  HealthProvider,
  ProviderHealthSnapshot,
} from "../../interfaces/health-provider.interface";
import type { ProviderOutageClassification } from "../../contracts/workflow.contracts";

import { CTraderFixClient } from "./ctrader-fix.client";

@Injectable()
export class CTraderFixHealthProvider implements HealthProvider {
  constructor(
    private readonly client: CTraderFixClient,
  ) {}

  async checkHealth(): Promise<ProviderHealthSnapshot> {
    const startedAt = Date.now();
    const state = this.client.state;

    let status: ProviderOutageClassification;

    if (state.connected && state.loggedOn) {
      status = "healthy";
    } else if (state.connected && !state.loggedOn) {
      status = "degraded";
    } else if (
      state.lastMessageAt !== null ||
      state.lastQuoteAt !== null ||
      state.reconnectAttempts > 0
    ) {
      status = "down";
    } else {
      status = "unknown";
    }

    const lastQuote = state.lastQuoteAt
      ? state.lastQuoteAt.toISOString()
      : "never";

    const lastMessage = state.lastMessageAt
      ? state.lastMessageAt.toISOString()
      : "never";

    return {
      status,
      latencyMs: Date.now() - startedAt,
      lastCheckedAt: new Date(),
      message:
        `connected=${state.connected} ` +
        `loggedOn=${state.loggedOn} ` +
        `lastMessageAt=${lastMessage} ` +
        `lastQuoteAt=${lastQuote} ` +
        `reconnectAttempts=${state.reconnectAttempts}`,
    };
  }
}
