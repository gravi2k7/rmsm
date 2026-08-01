import { Injectable, Logger } from "@nestjs/common";
import { NotFoundError, ValidationError } from "@rmsm/shared";
import { DataGapRepository } from "../repositories/data-gap.repository";
import { MarketDataProviderConfigRepository } from "../repositories/market-data-provider-config.repository";
import { InstrumentAliasRepository } from "../repositories/instrument-alias.repository";
import { ProviderFailoverService } from "./provider-failover.service";
import { HistoricalImportService } from "./historical-import.service";
import type { DataGapModel } from "../interfaces/models/operational.models";
import { DomainEventPublisher } from "../../../common/events/domain-event-publisher.service";
import { MarketDataStreamPublisherService, MARKET_DATA_STREAMS } from "./market-data-stream-publisher.service";
import { FIP001_EVENTS } from "../../../common/events/fip001-events";

/**
 * FIP-001 Domain 7's "automatic gap repair using alternate providers" —
 * built directly on top of `ProviderFailoverService` (Domain 1, this
 * phase) rather than a second, parallel failover mechanism: repairing a
 * gap IS a failover-shaped problem ("my primary source didn't have this
 * data, try the next candidate"), so this service reuses that one.
 */
@Injectable()
export class GapRepairService {
  private readonly logger = new Logger(GapRepairService.name);

  constructor(
    private readonly gapRepository: DataGapRepository,
    private readonly providerConfigRepository: MarketDataProviderConfigRepository,
    private readonly instrumentAliasRepository: InstrumentAliasRepository,
    private readonly failoverService: ProviderFailoverService,
    private readonly historicalImportService: HistoricalImportService,
    private readonly eventPublisher: DomainEventPublisher,
    private readonly streamPublisher: MarketDataStreamPublisherService,
  ) {}

  async repairGap(gapId: string, actorId: string | null): Promise<DataGapModel> {
    const gap = await this.gapRepository.findById(gapId);
    if (!gap) throw new NotFoundError("DataGap", gapId);

    await this.gapRepository.markStatus(gap.id, "BACKFILLING");
    await this.gapRepository.incrementRepairAttempts(gap.id);

    const candidateTypes = await this.failoverService.getCandidateTypes();
    const aliases = await this.instrumentAliasRepository.findByInstrument(gap.instrumentId);
    // InstrumentAliasModel only carries `providerId` (a MarketDataProviderConfig id), not the
    // provider's type — resolve each alias's own config to learn its type before it can be
    // matched against the priority-ordered candidateTypes list.
    const aliasWithType = await Promise.all(
      aliases.map(async (alias) => ({ alias, config: await this.providerConfigRepository.findById(alias.providerId) })),
    );
    const candidateProviderIds = aliasWithType
      .filter((entry): entry is { alias: typeof entry.alias; config: NonNullable<typeof entry.config> } => entry.config !== null && candidateTypes.includes(entry.config.type))
      .sort((a, b) => candidateTypes.indexOf(a.config.type) - candidateTypes.indexOf(b.config.type))
      .map((entry) => entry.alias.providerId);

    if (candidateProviderIds.length === 0) {
      await this.gapRepository.markStatus(gap.id, "UNRESOLVED");
      throw new ValidationError(`No alternate provider has an alias mapping for instrument ${gap.instrumentId} — cannot repair gap ${gapId}.`);
    }

    let lastError: unknown = null;
    for (const providerConfigId of candidateProviderIds) {
      try {
        await this.historicalImportService.importHistoricalCandles(
          { instrumentId: gap.instrumentId, providerConfigId, interval: gap.interval, from: gap.gapStart, to: gap.gapEnd },
          actorId,
        );
        const repaired = await this.gapRepository.markRepaired(gap.id, providerConfigId);
        const payload = { gapId: gap.id, instrumentId: gap.instrumentId, interval: gap.interval, repairedByProviderId: providerConfigId };
        this.eventPublisher.publish(FIP001_EVENTS.GAP_REPAIRED, payload);
        await this.streamPublisher.publish(MARKET_DATA_STREAMS.GAP, FIP001_EVENTS.GAP_REPAIRED, payload);
        this.eventPublisher.publish(FIP001_EVENTS.GAP_RESOLVED, payload);
        return repaired;
      } catch (error) {
        lastError = error;
        this.logger.warn(`Gap ${gapId} repair attempt via provider config ${providerConfigId} failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    await this.gapRepository.markStatus(gap.id, "UNRESOLVED");
    const message = lastError instanceof Error ? lastError.message : String(lastError);
    throw new ValidationError(`Gap ${gapId} could not be repaired — every alternate provider failed. Last error: ${message}`);
  }
}
