import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import type { BrokerStreamingService } from "../../interfaces/broker-streaming-service.interface";
import type { BrokerTick, BrokerOrderResult, BrokerPosition, BrokerAccountInfo, BrokerSubscription } from "../../interfaces/broker-models";
import type { BrokerOrderStatus, BrokerOrderType } from "../../contracts/broker.contracts";
import type { Mt5StreamEvent, Mt5TickResponse, Mt5OrderResponse, Mt5PositionResponse, Mt5AccountResponse } from "./metatrader5.types";

/**
 * BR-001's Streaming Service section: Live Tick Updates, Order Updates,
 * Position Updates, Account Updates — "implement event-driven
 * subscriptions." One shared WebSocket connection to the gateway's
 * `/stream` endpoint is opened lazily on the first `subscribe*()` call
 * and closed once the last subscriber unsubscribes, rather than one
 * socket per subscription — the gateway contract (metatrader5.types.ts)
 * multiplexes every event type over that one connection, tagged by
 * `Mt5StreamEvent.type`.
 */
@Injectable()
export class MetaTrader5StreamingService implements BrokerStreamingService, OnModuleDestroy {
  private readonly logger = new Logger(MetaTrader5StreamingService.name);
  private ws: WebSocket | undefined;
  private readonly tickHandlers = new Set<(tick: BrokerTick) => void>();
  private readonly orderHandlers = new Set<(order: BrokerOrderResult) => void>();
  private readonly positionHandlers = new Set<(position: BrokerPosition) => void>();
  private readonly accountHandlers = new Set<(account: BrokerAccountInfo) => void>();

  constructor(private readonly gatewayUrl: string) {}

  subscribeTicks(symbols: string[], handler: (tick: BrokerTick) => void): BrokerSubscription {
    this.tickHandlers.add(handler);
    this.ensureConnected();
    this.send({ type: "subscribe", channel: "tick", symbols });
    return this.toSubscription(() => this.tickHandlers.delete(handler));
  }

  subscribeOrderUpdates(handler: (order: BrokerOrderResult) => void): BrokerSubscription {
    this.orderHandlers.add(handler);
    this.ensureConnected();
    return this.toSubscription(() => this.orderHandlers.delete(handler));
  }

  subscribePositionUpdates(handler: (position: BrokerPosition) => void): BrokerSubscription {
    this.positionHandlers.add(handler);
    this.ensureConnected();
    return this.toSubscription(() => this.positionHandlers.delete(handler));
  }

  subscribeAccountUpdates(handler: (account: BrokerAccountInfo) => void): BrokerSubscription {
    this.accountHandlers.add(handler);
    this.ensureConnected();
    return this.toSubscription(() => this.accountHandlers.delete(handler));
  }

  onModuleDestroy(): void {
    this.ws?.close();
    this.ws = undefined;
  }

  private toSubscription(unsubscribeFn: () => void): BrokerSubscription {
    return {
      unsubscribe: () => {
        unsubscribeFn();
        this.disconnectIfIdle();
      },
    };
  }

  private ensureConnected(): void {
    if (this.ws) return;
    const wsUrl = `${this.gatewayUrl.replace(/^http/, "ws")}/stream`;
    this.logger.log({ msg: "mt5.streaming.connect", wsUrl });
    this.ws = new WebSocket(wsUrl);
    this.ws.onmessage = (event) => this.handleMessage(event.data);
    this.ws.onclose = () => {
      this.logger.log({ msg: "mt5.streaming.disconnected" });
      this.ws = undefined;
    };
    this.ws.onerror = () => {
      this.logger.warn({ msg: "mt5.streaming.error" });
    };
  }

  private disconnectIfIdle(): void {
    if (this.tickHandlers.size === 0 && this.orderHandlers.size === 0 && this.positionHandlers.size === 0 && this.accountHandlers.size === 0) {
      this.ws?.close();
      this.ws = undefined;
    }
  }

  private send(message: unknown): void {
    if (this.ws && this.ws.readyState === this.ws.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private handleMessage(data: unknown): void {
    try {
      const parsed = JSON.parse(String(data)) as Mt5StreamEvent;
      switch (parsed.type) {
        case "tick":
          this.dispatchTick(parsed.payload as Mt5TickResponse);
          break;
        case "order":
          this.dispatchOrder(parsed.payload as Mt5OrderResponse);
          break;
        case "position":
          this.dispatchPosition(parsed.payload as Mt5PositionResponse);
          break;
        case "account":
          this.dispatchAccount(parsed.payload as Mt5AccountResponse);
          break;
      }
    } catch {
      this.logger.warn({ msg: "mt5.streaming.malformed_event" });
    }
  }

  private dispatchTick(raw: Mt5TickResponse): void {
    const tick: BrokerTick = { symbol: raw.symbol, bid: raw.bid, ask: raw.ask, last: raw.last, volume: raw.volume, eventTime: new Date(raw.time) };
    this.tickHandlers.forEach((h) => h(tick));
  }

  private dispatchOrder(raw: Mt5OrderResponse): void {
    const order: BrokerOrderResult = { orderId: raw.orderId, status: raw.status as BrokerOrderStatus, symbol: raw.symbol, type: raw.type as BrokerOrderType, volume: raw.volume, price: raw.price, message: raw.message };
    this.orderHandlers.forEach((h) => h(order));
  }

  private dispatchPosition(raw: Mt5PositionResponse): void {
    const position: BrokerPosition = {
      positionId: raw.ticket,
      symbol: raw.symbol,
      side: raw.type,
      volume: raw.volume,
      openPrice: raw.priceOpen,
      currentPrice: raw.priceCurrent,
      floatingProfit: raw.profit,
      swap: raw.swap,
      commission: raw.commission,
      openedAt: new Date(raw.timeOpen),
    };
    this.positionHandlers.forEach((h) => h(position));
  }

  private dispatchAccount(raw: Mt5AccountResponse): void {
    const account: BrokerAccountInfo = {
      accountNumber: raw.login,
      accountName: raw.name,
      balance: raw.balance,
      equity: raw.equity,
      margin: raw.margin,
      freeMargin: raw.marginFree,
      marginLevel: raw.marginLevel,
      currency: raw.currency,
      leverage: raw.leverage,
    };
    this.accountHandlers.forEach((h) => h(account));
  }
}
