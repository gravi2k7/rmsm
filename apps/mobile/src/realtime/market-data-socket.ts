import { getAccessToken } from "../auth/auth-storage";
import type { MarketDataStreamMessage } from "../types/market-data";

export type MarketDataSocketHandlers = {
  onConnected?: () => void;
  onQuote?: (
    message: Extract<
      MarketDataStreamMessage,
      { type: "market-data.quote" }
    >,
  ) => void;
  onCandle?: (
    message: Extract<
      MarketDataStreamMessage,
      { type: "market-data.candle" }
    >,
  ) => void;
  onError?: (error: Error) => void;
  onClosed?: () => void;
};

export class MarketDataSocket {
  private socket: WebSocket | null = null;

  constructor(
    private readonly url: string,
    private readonly instrumentIds: string[],
    private readonly handlers: MarketDataSocketHandlers = {},
  ) {}

  async connect(): Promise<void> {
    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const accessToken = await getAccessToken();

    if (!accessToken) {
      this.handlers.onError?.(
        new Error("Market-data WebSocket requires authentication"),
      );
      return;
    }

    if (this.instrumentIds.length === 0) {
      this.handlers.onError?.(
        new Error("Market-data WebSocket requires instruments"),
      );
      return;
    }

    const separator = this.url.includes("?") ? "&" : "?";
    const websocketUrl =
      `${this.url}${separator}` +
      `accessToken=${encodeURIComponent(accessToken)}`;

    const socket = new WebSocket(websocketUrl);
    this.socket = socket;

    socket.onopen = () => {
      console.log("[MarketDataSocket] OPEN", {
        url: this.url,
        instrumentIds: this.instrumentIds,
      });

      socket.send(
        JSON.stringify({
          type: "market-data.subscribe",
          instrumentIds: this.instrumentIds,
        }),
      );

      console.log("[MarketDataSocket] SUBSCRIBE SENT", this.instrumentIds);
    };

    socket.onmessage = (event) => {
      try {
        const raw = String(event.data);

        console.log("[MarketDataSocket] MESSAGE", raw);

        const message = JSON.parse(raw) as MarketDataStreamMessage;

        switch (message.type) {
          case "market-data.connected":
            this.handlers.onConnected?.();
            break;

          case "market-data.quote":
            console.log("[MarketDataSocket] QUOTE", {
              instrumentId: message.data.instrumentId,
              providerSymbol: message.data.providerSymbol,
              bidPrice: message.data.bidPrice,
              askPrice: message.data.askPrice,
              lastPrice: message.data.lastPrice,
              eventTime: message.data.eventTime,
            });
            this.handlers.onQuote?.(message);
            break;

          case "market-data.candle":
            this.handlers.onCandle?.(message);
            break;

          case "market-data.error":
            this.handlers.onError?.(new Error(message.error));
            break;

          case "market-data.subscribed":
          case "market-data.unsubscribed":
          case "market-data.heartbeat":
            break;
        }
      } catch {
        this.handlers.onError?.(
          new Error("Invalid market-data WebSocket message"),
        );
      }
    };

    socket.onerror = () => {
      console.log("[MarketDataSocket] ERROR");
      this.handlers.onError?.(
        new Error("Market-data WebSocket connection error"),
      );
    };

    socket.onclose = () => {
      console.log("[MarketDataSocket] CLOSED");
      if (this.socket === socket) {
        this.socket = null;
      }

      this.handlers.onClosed?.();
    };
  }

  disconnect(): void {
    const socket = this.socket;
    this.socket = null;

    if (socket) {
      socket.close();
    }
  }
}
