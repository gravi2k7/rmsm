import { Injectable } from "@nestjs/common";
import type { IntegrationEventHandler } from "./integration-event-handler.interface";
import type { IntegrationEvent } from "../events/integration-event.interface";
import { StrategyEventMetricsService } from "../services/strategy-event-metrics.service";

@Injectable()
export class MetricsEventHandler implements IntegrationEventHandler {
  constructor(private readonly metrics: StrategyEventMetricsService) {}

  async handle(event: IntegrationEvent): Promise<void> {
    this.metrics.recordEventPublished(event.eventType);
  }
}
