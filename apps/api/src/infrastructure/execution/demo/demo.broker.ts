import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  Commission,
  Fill,
  Quantity,
  type Broker,
  type BrokerOrderAck,
  type Order,
} from "@rmsm/execution";
import { CurrencyCode, Price } from "@rmsm/market";
import { MarketDataService } from "../../../modules/market-data/services/market-data.service";

@Injectable()
export class DemoBroker implements Broker {
  private readonly fillsByOrderId = new Map<string, Fill[]>();
  private readonly activeOrderIds = new Set<string>();

  constructor(
    private readonly marketDataService: MarketDataService,
  ) {}

  async submitOrder(order: Order): Promise<BrokerOrderAck> {
    if (order.type !== "MARKET") {
      return {
        accepted: false,
        rejectionReason:
          `DEMO broker currently supports MARKET orders only; received ${order.type}.`,
      };
    }

    const instruments = await this.marketDataService.searchInstruments(
      {
        search: order.symbolCode.value,
        status: "ACTIVE",
      },
      {
        take: 10,
        skip: 0,
      },
    );

    const exactMatches = instruments.filter(
      (instrument) =>
        instrument.symbol.toUpperCase() === order.symbolCode.value,
    );

    if (exactMatches.length === 0) {
      return {
        accepted: false,
        rejectionReason:
          `No ACTIVE instrument found for symbol ${order.symbolCode.value}.`,
      };
    }

    if (exactMatches.length > 1) {
      return {
        accepted: false,
        rejectionReason:
          `Multiple ACTIVE instruments found for symbol ${order.symbolCode.value}; DEMO execution requires an unambiguous instrument.`,
      };
    }

    const instrument = exactMatches[0];

    if (!instrument) {
      return {
        accepted: false,
        rejectionReason:
          `No ACTIVE instrument found for symbol ${order.symbolCode.value}.`,
      };
    }

    const quote = await this.marketDataService.getLatestQuote(
      instrument.id,
    );

    const rawPrice =
      order.side === "BUY" ? quote.askPrice : quote.bidPrice;

    if (rawPrice === null) {
      return {
        accepted: false,
        rejectionReason:
          order.side === "BUY"
            ? "No ask price is available for the instrument."
            : "No bid price is available for the instrument.",
      };
    }

    const precision = getPricePrecision(
      instrument.tickSize,
      rawPrice,
    );

    const priceResult = Price.create(
      Number(rawPrice),
      precision,
    );

    if (!priceResult.ok) {
      return {
        accepted: false,
        rejectionReason: priceResult.error.message,
      };
    }

    if (!instrument.currency) {
      return {
        accepted: false,
        rejectionReason:
          `Instrument ${instrument.symbol} has no currency configured.`,
      };
    }

    const currencyResult = CurrencyCode.create(
      instrument.currency,
    );

    if (!currencyResult.ok) {
      return {
        accepted: false,
        rejectionReason: currencyResult.error.message,
      };
    }

    const quantityResult = Quantity.create(
      order.quantity.units,
    );

    if (!quantityResult.ok) {
      return {
        accepted: false,
        rejectionReason: quantityResult.error.message,
      };
    }

    const fill = Fill.create(randomUUID(), {
      orderId: order.id,
      price: priceResult.value,
      quantity: quantityResult.value,
      commission: Commission.zero(currencyResult.value),
      filledAt: quote.eventTime,
    });

    this.activeOrderIds.add(order.id);

    const existing = this.fillsByOrderId.get(order.id) ?? [];
    this.fillsByOrderId.set(order.id, [
      ...existing,
      fill,
    ]);

    return {
      accepted: true,
      brokerOrderId: `DEMO-${order.id}`,
    };
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    if (!this.activeOrderIds.has(orderId)) {
      return false;
    }

    this.activeOrderIds.delete(orderId);
    this.fillsByOrderId.delete(orderId);

    return true;
  }

  async getFills(orderId: string): Promise<Fill[]> {
    const fills = this.fillsByOrderId.get(orderId) ?? [];

    this.fillsByOrderId.delete(orderId);
    this.activeOrderIds.delete(orderId);

    return fills;
  }
}

function getPricePrecision(
  tickSize: string | null | undefined,
  rawPrice: string,
): number {
  if (tickSize) {
    const tickPrecision = decimalPlaces(tickSize);

    if (tickPrecision >= 0) {
      return tickPrecision;
    }
  }

  return decimalPlaces(rawPrice);
}

function decimalPlaces(value: string): number {
  const normalized = value.trim();

  if (!/^\d+(?:\.\d+)?$/.test(normalized)) {
    return -1;
  }

  const decimalIndex = normalized.indexOf(".");

  return decimalIndex === -1
    ? 0
    : normalized.length - decimalIndex - 1;
}
