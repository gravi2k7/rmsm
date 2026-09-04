import { useAuthStore } from "@/lib/auth-store";

export interface MarketDataQuoteEvent {
  instrumentId: string;
  providerSymbol: string;
  bidPrice?: string;
  askPrice?: string;
  lastPrice?: string;
  bidSize?: string;
  askSize?: string;
  eventTime: string;
  sourceTimestamp?: string;
}

export interface MarketDataCandleEvent {
  instrumentId: string;
  providerSymbol: string;
  providerId: string;
  interval: string;
  source: string;
  eventTime: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  sourceTimestamp?: string;
}

export interface MarketDataDepthLevelEvent {
  price: string;
  size?: string;
}

export interface MarketDataDepthEvent {
  instrumentId: string;
  providerSymbol: string;
  bids: readonly MarketDataDepthLevelEvent[];
  asks: readonly MarketDataDepthLevelEvent[];
  eventTime: string;
}

export interface MarketDataWebSocketErrorEvent {
  error: string;
}

export interface MarketDataWebSocketClientOptions {
  onConnected?: () => void;
  onQuote?: (quote: MarketDataQuoteEvent) => void;
  onCandle?: (candle: MarketDataCandleEvent) => void;
  onDepth?: (depth: MarketDataDepthEvent) => void;
  onError?: (error: MarketDataWebSocketErrorEvent) => void;
  onDisconnected?: () => void;
}

const DEFAULT_API_BASE_URL = "/api/v1";

function resolveWebSocketUrl(): string {
  const configuredBaseUrl =
    process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_BASE_URL;

  if (configuredBaseUrl.startsWith("http://")) {
    return `${configuredBaseUrl.replace(/^http:/, "ws:")}/market-data/ws`;
  }

  if (configuredBaseUrl.startsWith("https://")) {
    return `${configuredBaseUrl.replace(/^https:/, "wss:")}/market-data/ws`;
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";

  const normalizedPath = configuredBaseUrl.endsWith("/")
    ? configuredBaseUrl.slice(0, -1)
    : configuredBaseUrl;

  return `${protocol}//${window.location.host}${normalizedPath}/market-data/ws`;
}

export class MarketDataWebSocketClient {
  private socket: WebSocket | null = null;

  private readonly subscriptions = new Set<string>();

  private manuallyDisconnected = false;

  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private reconnectAttempt = 0;

  constructor(
    private readonly options: MarketDataWebSocketClientOptions = {},
  ) {}

  connect(): void {
    this.manuallyDisconnected = false;

    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const accessToken = useAuthStore.getState().accessToken;

    if (!accessToken) {
      this.options.onError?.({
        error: "Authentication required",
      });
      return;
    }

    this.clearReconnectTimer();

    const url = new URL(resolveWebSocketUrl(), window.location.origin);

    url.searchParams.set("accessToken", accessToken);

    const socket = new WebSocket(url.toString());

    this.socket = socket;

    socket.addEventListener("open", () => {
      this.reconnectAttempt = 0;
    });

    socket.addEventListener("message", (event) => {
      this.handleMessage(event.data);
    });

    socket.addEventListener("close", () => {
      // A stale socket must never schedule a reconnect.
      // Only the currently active socket owns reconnect lifecycle.
      if (this.socket !== socket) {
        return;
      }

      this.socket = null;

      this.options.onDisconnected?.();

      if (!this.manuallyDisconnected) {
        this.scheduleReconnect();
      }
    });

    socket.addEventListener("error", () => {
      this.options.onError?.({
        error: "Market-data WebSocket connection error",
      });
    });
  }

  disconnect(): void {
    this.manuallyDisconnected = true;
    this.clearReconnectTimer();
    this.reconnectAttempt = 0;

    const socket = this.socket;

    this.socket = null;

    if (socket) {
      socket.close();
    }
  }

  subscribe(instrumentIds: readonly string[]): void {
    for (const instrumentId of instrumentIds) {
      if (instrumentId) {
        this.subscriptions.add(instrumentId);
      }
    }

    this.sendSubscription("market-data.subscribe", instrumentIds);
  }

  unsubscribe(instrumentIds: readonly string[]): void {
    for (const instrumentId of instrumentIds) {
      this.subscriptions.delete(instrumentId);
    }

    this.sendSubscription("market-data.unsubscribe", instrumentIds);
  }

  getSubscribedInstrumentIds(): string[] {
    return [...this.subscriptions];
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  private sendSubscription(
    type: "market-data.subscribe" | "market-data.unsubscribe",
    instrumentIds: readonly string[],
  ): void {
    if (
      instrumentIds.length === 0 ||
      !this.socket ||
      this.socket.readyState !== WebSocket.OPEN
    ) {
      return;
    }

    this.socket.send(
      JSON.stringify({
        type,
        instrumentIds: [...instrumentIds],
      }),
    );
  }

  private handleMessage(raw: unknown): void {
    if (typeof raw !== "string") {
      return;
    }

    let message: unknown;

    try {
      message = JSON.parse(raw);
    } catch {
      this.options.onError?.({
        error: "Invalid market-data WebSocket message",
      });
      return;
    }

    if (!this.isRecord(message) || typeof message.type !== "string") {
      this.options.onError?.({
        error: "Invalid market-data WebSocket message",
      });
      return;
    }

    switch (message.type) {
      case "market-data.connected":
        this.options.onConnected?.();
        this.resubscribe();
        return;

      case "market-data.heartbeat":
        return;

      case "market-data.quote":
        if (this.isRecord(message.data)) {
          this.options.onQuote?.(
            message.data as unknown as MarketDataQuoteEvent,
          );
        }
        return;

      case "market-data.candle":
        if (this.isRecord(message.data)) {
          this.options.onCandle?.(
            message.data as unknown as MarketDataCandleEvent,
          );
        }
        return;

      case "market-data.depth":
        if (this.isRecord(message.data)) {
          this.options.onDepth?.(
            message.data as unknown as MarketDataDepthEvent,
          );
        }
        return;

      case "market-data.error":
        if (typeof message.error === "string") {
          this.options.onError?.({
            error: message.error,
          });
        }
        return;

      case "market-data.subscribed":
      case "market-data.unsubscribed":
        return;

      default:
        return;
    }
  }

  private resubscribe(): void {
    if (this.subscriptions.size === 0) {
      return;
    }

    this.sendSubscription(
      "market-data.subscribe",
      [...this.subscriptions],
    );
  }

  private scheduleReconnect(): void {
    if (this.manuallyDisconnected || this.reconnectTimer !== null) {
      return;
    }

    const delay = Math.min(
      1_000 * 2 ** this.reconnectAttempt,
      30_000,
    );

    this.reconnectAttempt += 1;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private isRecord(
    value: unknown,
  ): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
  }
}
