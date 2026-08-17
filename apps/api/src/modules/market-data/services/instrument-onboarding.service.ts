import { Injectable } from "@nestjs/common";
import { TransactionManager } from "@rmsm/database";
import { NotFoundError, ValidationError } from "@rmsm/shared";
import { InstrumentRepository } from "../repositories/instrument.repository";
import { InstrumentAliasRepository } from "../repositories/instrument-alias.repository";
import { ExchangeRepository } from "../repositories/exchange.repository";
import { MarketDataProviderConfigRepository } from "../repositories/market-data-provider-config.repository";
import type { InstrumentModel } from "../interfaces/models/reference-data.models";
import type { InstrumentOnboardingDto } from "../dto/instrument-onboarding.dto";

@Injectable()
export class InstrumentOnboardingService {
  constructor(
    private readonly providerConfigRepository: MarketDataProviderConfigRepository,
    private readonly instrumentRepository: InstrumentRepository,
    private readonly instrumentAliasRepository: InstrumentAliasRepository,
    private readonly exchangeRepository: ExchangeRepository,
    private readonly transactionManager: TransactionManager,
  ) {}

  async onboard(
    request: InstrumentOnboardingDto,
  ): Promise<InstrumentModel> {
    const providerConfig = await this.providerConfigRepository.findById(
      request.providerConfigId,
    );

    if (!providerConfig || !providerConfig.isActive) {
      throw new NotFoundError(
        "MarketDataProviderConfig",
        request.providerConfigId,
      );
    }

    const providerSymbol = request.providerSymbol.trim();
    const name = request.name.trim();
    const currency = request.currency.trim().toUpperCase();
    const exchangeCode = request.exchangeCode?.trim();

    if (!providerSymbol) {
      throw new ValidationError("Provider symbol must not be empty.");
    }

    if (!name) {
      throw new ValidationError("Instrument name must not be empty.");
    }

    if (!currency) {
      throw new ValidationError("Instrument currency must not be empty.");
    }

    return this.transactionManager.run(async (tx) => {
      let exchangeId: string | null = null;

      if (exchangeCode) {
        const exchange = await this.exchangeRepository.findByCode(
          exchangeCode,
          tx,
        );

        if (!exchange) {
          throw new NotFoundError("Exchange", exchangeCode);
        }

        if (!exchange.isActive) {
          throw new ValidationError(
            `Exchange "${exchangeCode}" is not active.`,
          );
        }

        exchangeId = exchange.id;
      } else if (
        request.assetClass !== "FOREX" &&
        request.assetClass !== "COMMODITY"
      ) {
        throw new ValidationError(
          `Exchange code is required for ${request.assetClass} instruments.`,
        );
      }

      const instrument = await this.instrumentRepository.upsert(
        {
          exchangeId,
          symbol: providerSymbol,
          name,
          assetClass: request.assetClass,
          currency,
        },
        tx,
      );

      await this.instrumentAliasRepository.upsert(
        {
          instrumentId: instrument.id,
          providerId: providerConfig.id,
          providerSymbol,
        },
        tx,
      );

      return instrument;
    });
  }
}
