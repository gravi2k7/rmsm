import { Injectable } from "@nestjs/common";
import type { BrokerPositionService } from "../../interfaces/broker-position-service.interface";
import type { BrokerPosition } from "../../interfaces/broker-models";
import { MetaTrader5Client } from "./metatrader5.client";
import type { Mt5PositionResponse } from "./metatrader5.types";

/** BR-001's Position Service section: Open Positions, Position Details, Floating Profit, Swap, Commission. See `BrokerPositionService`'s own doc comment for why "Closed Positions" is intentionally not duplicated here — it's `MetaTrader5HistoryService.getDealHistory()`. */
@Injectable()
export class MetaTrader5PositionService implements BrokerPositionService {
  constructor(private readonly client: MetaTrader5Client) {}

  async listOpenPositions(): Promise<BrokerPosition[]> {
    const raw = await this.client.request<Mt5PositionResponse[]>("GET", "/positions");
    return raw.map((p) => this.toPosition(p));
  }

  async getPosition(positionId: string): Promise<BrokerPosition> {
    const raw = await this.client.request<Mt5PositionResponse>("GET", `/positions/${encodeURIComponent(positionId)}`);
    return this.toPosition(raw);
  }

  private toPosition(raw: Mt5PositionResponse): BrokerPosition {
    return {
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
  }
}
