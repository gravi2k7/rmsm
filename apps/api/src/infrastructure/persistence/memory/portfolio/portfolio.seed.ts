import { Injectable, OnModuleInit } from "@nestjs/common";
import { Portfolio } from "@rmsm/portfolio";
import { InMemoryPortfolioRepository } from "./portfolio.memory-repository";

/** The one portfolio this phase's API operates against — `Portfolio`
 * (the domain aggregate) carries no owner/user association of its own,
 * and no ownership model has been introduced at the application layer
 * yet (a real one is a genuinely new decision — which account owns which
 * portfolio, one-per-user vs. one-per-organization — not implied by
 * anything built so far, so it isn't invented here). `GET /portfolio`
 * always resolves to this single, well-known id. */
export const DEFAULT_PORTFOLIO_ID = "default-portfolio";

@Injectable()
export class PortfolioSeedService implements OnModuleInit {
  constructor(private readonly portfolioRepository: InMemoryPortfolioRepository) {}

  async onModuleInit(): Promise<void> {
    const portfolio = Portfolio.create(DEFAULT_PORTFOLIO_ID, 100_000);
    await this.portfolioRepository.save(portfolio);
  }
}
