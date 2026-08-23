import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import type { Server, WebSocket } from "ws";

import {
  MarketDataStreamPublisher,
  type MarketDataCandleStreamPayload,
  type MarketDataQuoteStreamPayload,
} from "../services/market-data-stream.publisher";

@WebSocketGateway({
  path: "/api/v1/market-data/ws",
})
export class MarketDataGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private server!: Server;

  private readonly clients = new Set<WebSocket>();

  private readonly quoteListener = (
    payload: MarketDataQuoteStreamPayload,
  ): void => {
    this.broadcast({
      type: "market-data.quote",
      data: this.serializeQuote(payload),
    });
  };

  private readonly candleListener = (
    payload: MarketDataCandleStreamPayload,
  ): void => {
    this.broadcast({
      type: "market-data.candle",
      data: this.serializeCandle(payload),
    });
  };

  constructor(
    private readonly streamPublisher: MarketDataStreamPublisher,
  ) {
    this.streamPublisher.onQuote(this.quoteListener);
    this.streamPublisher.onCandle(this.candleListener);
  }

  handleConnection(client: WebSocket): void {
    this.clients.add(client);

    client.send(
      JSON.stringify({
        type: "market-data.connected",
      }),
    );
  }

  handleDisconnect(client: WebSocket): void {
    this.clients.delete(client);
  }

  private broadcast(message: unknown): void {
    const encoded = JSON.stringify(message);

    for (const client of this.clients) {
      if (client.readyState !== 1) {
        this.clients.delete(client);
        continue;
      }

      try {
        client.send(encoded);
      } catch {
        this.clients.delete(client);
      }
    }
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
}
