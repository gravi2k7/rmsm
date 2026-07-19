import { Injectable } from "@nestjs/common";
import type { ExchangeRepository, Exchange, MarketSession, SessionType } from "@rmsm/market";

/**
 * In-memory `ExchangeRepository` — Phase 4A's explicit persistence
 * strategy (see `/apps/api/PERSISTENCE_ROADMAP.md`): implements the
 * domain package's own repository interface exactly, so a future
 * Prisma-backed implementation is a drop-in replacement with no change
 * to any command/query handler that depends on `ExchangeRepository`.
 * Backed by a plain `Map`, seeded at construction with a small set of
 * reference exchanges — exchange/session data is reference data in a
 * real deployment (rarely created via the API itself), unlike the other
 * five domains' repositories, which intentionally start empty.
 */
@Injectable()
export class InMemoryExchangeRepository implements ExchangeRepository {
  private readonly exchanges = new Map<string, Exchange>();
  private readonly sessions = new Map<SessionType, MarketSession>();

  async findById(id: string): Promise<Exchange | null> {
    return this.exchanges.get(id) ?? null;
  }

  async findAll(): Promise<Exchange[]> {
    return Array.from(this.exchanges.values());
  }

  async save(exchange: Exchange): Promise<void> {
    this.exchanges.set(exchange.id, exchange);
  }

  async findSessionByType(type: SessionType): Promise<MarketSession | null> {
    return this.sessions.get(type) ?? null;
  }

  async findAllSessions(): Promise<MarketSession[]> {
    return Array.from(this.sessions.values());
  }

  async saveSession(session: MarketSession): Promise<void> {
    this.sessions.set(session.type, session);
  }
}
