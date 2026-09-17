import type { MarketDataStreamMessage } from "../types/market-data";

export type MarketDataSocketHandlers = {
  onConnected?: () => void;
  onQuote?: (message: Extract<
    MarketDataStreamMessage,
    { type: "market-data.quote" }
  >) => void;
  onCandle?: (message: Extract<
    MarketDataStreamMessage,
    { type: "market-data.candle" }
  >) => void;
  onError?: (error: Error) => void;
  onClosed?: () => void;
};

export class MarketDataSocket {
  private socket: WebSocket | null = null;

  constructor(
    private readonly url: string,
    private readonly handlers: MarketDataSocketHandlers = {},
  ) {}

  connect(): void {
    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const socket = new WebSocket(this.url);
    this.socket = socket;

    socket.onopen = () => {
      // The current RMSM gateway requires no client subscription message.
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(
          String(event.data),
        ) as MarketDataStreamMessage;

        switch (message.type) {
          case "market-data.connected":
            this.handlers.onConnected?.();
            break;

          case "market-data.quote":
            this.handlers.onQuote?.(message);
            break;

          case "market-data.candle":
            this.handlers.onCandle?.(message);
            break;
        }
      } catch {
        this.handlers.onError?.(
          new Error("Invalid market-data WebSocket message"),
        );
      }
    };

    socket.onerror = () => {
      this.handlers.onError?.(
        new Error("Market-data WebSocket connection error"),
      );
    };

    socket.onclose = () => {
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
