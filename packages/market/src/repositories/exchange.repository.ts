import type { Exchange } from "../entities/exchange";
import type { MarketSession } from "../entities/market-session";
import type { SessionType } from "../types/session-type";

export interface ExchangeRepository {
  findById(id: string): Promise<Exchange | null>;
  findAll(): Promise<Exchange[]>;
  save(exchange: Exchange): Promise<void>;

  findSessionByType(type: SessionType): Promise<MarketSession | null>;
  findAllSessions(): Promise<MarketSession[]>;
  saveSession(session: MarketSession): Promise<void>;
}
