import { OnModuleDestroy } from "@nestjs/common";
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import type { RawData, Server, WebSocket } from "ws";

import {
  MarketDataStreamPublisher,
  type MarketDataCandleStreamPayload,
  type MarketDataDepthStreamPayload,
  type MarketDataQuoteStreamPayload,
} from "../services/market-data-stream.publisher";

@WebSocketGateway({
  path: "/api/v1/market-data/ws",
})
export class MarketDataGateway
  implements
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnModuleDestroy
{
  @WebSocketServer()
  private server!: Server;

  private readonly clients = new Set<WebSocket>();

  private readonly subscriptions = new Map<WebSocket, Set<string>>();

  private readonly heartbeatIntervalMs = 25_000;

  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  private readonly quoteListener = (
    payload: MarketDataQuoteStreamPayload,
  ): void => {
    this.broadcastToSubscribers(payload.instrumentId, {
      type: "market-data.quote",
      data: this.serializeQuote(payload),
    });
  };

  private readonly candleListener = (
    payload: MarketDataCandleStreamPayload,
  ): void => {
    this.broadcastToSubscribers(payload.instrumentId, {
      type: "market-data.candle",
      data: this.serializeCandle(payload),
    });
  };

  private readonly depthListener = (
    payload: MarketDataDepthStreamPayload,
  ): void => {
    this.broadcastToSubscribers(payload.instrumentId, {
      type: "market-data.depth",
      data: this.serializeDepth(payload),
    });
  };

  constructor(
    private readonly streamPublisher: MarketDataStreamPublisher,
  ) {
    this.streamPublisher.onQuote(this.quoteListener);
    this.streamPublisher.onCandle(this.candleListener);
    this.streamPublisher.onDepth(this.depthListener);
  }

  onModuleDestroy(): void {
    this.stopHeartbeat();

    this.streamPublisher.offQuote(this.quoteListener);
    this.streamPublisher.offCandle(this.candleListener);
    this.streamPublisher.offDepth(this.depthListener);
  }

  handleConnection(client: WebSocket): void {
    this.clients.add(client);
    this.startHeartbeat();
    this.subscriptions.set(client, new Set<string>());

    client.on("message", (data: RawData) => {
      this.handleMessage(client, data);
    });

    client.on("error", () => {
      this.removeClient(client);
    });

    this.send(client, {
      type: "market-data.connected",
    });
  }

  handleDisconnect(client: WebSocket): void {
    this.removeClient(client);
  }

  private handleMessage(client: WebSocket, rawData: RawData): void {
    let message: unknown;

    try {
      message = JSON.parse(rawData.toString());
    } catch {
      this.sendError(client, "INVALID_MESSAGE", "Invalid JSON message.");
      return;
    }

    if (!this.isRecord(message) || typeof message.type !== "string") {
      this.sendError(
        client,
        "INVALID_MESSAGE",
        "Message must contain a string type.",
      );
      return;
    }

    switch (message.type) {
      case "market-data.subscribe":
        this.handleSubscribe(client, message.instrumentIds);
        return;

      case "market-data.unsubscribe":
        this.handleUnsubscribe(client, message.instrumentIds);
        return;

      default:
        this.sendError(
          client,
          "UNSUPPORTED_MESSAGE",
          `Unsupported message type: ${message.type}`,
        );
    }
  }

  private handleSubscribe(
    client: WebSocket,
    rawInstrumentIds: unknown,
  ): void {
    const instrumentIds = this.parseInstrumentIds(rawInstrumentIds);

    if (instrumentIds.length === 0) {
      this.sendError(
        client,
        "INVALID_SUBSCRIPTION",
        "instrumentIds must contain at least one instrument ID.",
      );
      return;
    }

    const subscriptions = this.subscriptions.get(client);

    if (!subscriptions) {
      return;
    }

    for (const instrumentId of instrumentIds) {
      subscriptions.add(instrumentId);
    }

    this.send(client, {
      type: "market-data.subscribed",
      data: {
        instrumentIds,
      },
    });
  }

  private handleUnsubscribe(
    client: WebSocket,
    rawInstrumentIds: unknown,
  ): void {
    const instrumentIds = this.parseInstrumentIds(rawInstrumentIds);

    if (instrumentIds.length === 0) {
      this.sendError(
        client,
        "INVALID_SUBSCRIPTION",
        "instrumentIds must contain at least one instrument ID.",
      );
      return;
    }

    const subscriptions = this.subscriptions.get(client);

    if (!subscriptions) {
      return;
    }

    for (const instrumentId of instrumentIds) {
      subscriptions.delete(instrumentId);
    }

    this.send(client, {
      type: "market-data.unsubscribed",
      data: {
        instrumentIds,
      },
    });
  }

  private parseInstrumentIds(rawInstrumentIds: unknown): string[] {
    if (!Array.isArray(rawInstrumentIds)) {
      return [];
    }

    return [
      ...new Set(
        rawInstrumentIds.filter(
          (instrumentId): instrumentId is string =>
            typeof instrumentId === "string" &&
            instrumentId.trim().length > 0,
        ),
      ),
    ];
  }

  private broadcastToSubscribers(
    instrumentId: string,
    message: unknown,
  ): void {
    const encoded = JSON.stringify(message);

    for (const client of this.clients) {
      if (client.readyState !== 1) {
        this.removeClient(client);
        continue;
      }

      const subscriptions = this.subscriptions.get(client);

      if (!subscriptions?.has(instrumentId)) {
        continue;
      }

      try {
        client.send(encoded);
      } catch {
        this.removeClient(client);
      }
    }
  }

  private send(client: WebSocket, message: unknown): void {
    if (client.readyState !== 1) {
      this.removeClient(client);
      return;
    }

    try {
      client.send(JSON.stringify(message));
    } catch {
      this.removeClient(client);
    }
  }

  private sendError(
    client: WebSocket,
    code: string,
    message: string,
  ): void {
    this.send(client, {
      type: "market-data.error",
      error: {
        code,
        message,
      },
    });
  }

  private removeClient(client: WebSocket): void {
    this.clients.delete(client);
    this.subscriptions.delete(client);

    if (this.clients.size === 0) {
      this.stopHeartbeat();
    }
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      return;
    }

    this.heartbeatTimer = setInterval(() => {
      for (const client of this.clients) {
        if (client.readyState !== 1) {
          this.removeClient(client);
          continue;
        }

        try {
          client.ping();
        } catch {
          this.removeClient(client);
        }
      }
    }, this.heartbeatIntervalMs);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer === null) {
      return;
    }

    clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
  }

  private serializeQuote(
    payload: MarketDataQuoteStreamPayload,
  ): Record<string, unknown> {
    return {
      ...payload,
      eventTime: payload.eventTime.toISOString(),
      sourceTimestamp: payload.sourceTimestamp?.toISOString(),
    };
  }

  private serializeCandle(
    payload: MarketDataCandleStreamPayload,
  ): Record<string, unknown> {
    return {
      ...payload,
      eventTime: payload.eventTime.toISOString(),
      sourceTimestamp: payload.sourceTimestamp?.toISOString(),
    };
  }

  private serializeDepth(
    payload: MarketDataDepthStreamPayload,
  ): Record<string, unknown> {
    return {
      ...payload,
      eventTime: payload.eventTime.toISOString(),
    };
  }
}
