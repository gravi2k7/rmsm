import { QualityScoringService } from "../quality-scoring.service";
import type { CandleQualityMetadataRepository } from "../../repositories/candle-quality-metadata.repository";
import type { DomainEventPublisher } from "../../../../common/events/domain-event-publisher.service";
import type { MarketDataStreamPublisherService } from "../market-data-stream-publisher.service";

function buildService() {
  const qualityMetadataRepository = {
    upsert: jest.fn().mockImplementation(async (data) => ({
      id: "qm1",
      processingTimestamp: new Date(),
      importVersion: 1,
      ...data,
      qualityScore: String(data.qualityScore),
      confidenceScore: String(data.confidenceScore),
    })),
  } as unknown as CandleQualityMetadataRepository;
  const eventPublisher = { publish: jest.fn() } as unknown as DomainEventPublisher;
  const streamPublisher = { publish: jest.fn().mockResolvedValue(undefined) } as unknown as MarketDataStreamPublisherService;
  const service = new QualityScoringService(qualityMetadataRepository, eventPublisher, streamPublisher);
  return { service, qualityMetadataRepository, eventPublisher, streamPublisher };
}

describe("QualityScoringService", () => {
  it("scores a healthy import at 100/VALID", async () => {
    const { service, qualityMetadataRepository } = buildService();
    const processingStartedAt = new Date(Date.now() - 50);

    const result = await service.scoreImportedCandle({
      candleId: "candle1",
      instrumentId: "inst1",
      sourceProviderType: "TWELVE_DATA",
      importTimestamp: new Date(),
      processingStartedAt,
      passedStructuralValidation: true,
      providerCircuitHealthy: true,
    });

    expect(result.qualityScore).toBe("100");
    expect(result.validationStatus).toBe("VALID");
    expect(qualityMetadataRepository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ candleId: "candle1", qualityScore: 100, confidenceScore: 100 }),
    );
  });

  it("reduces the score and flags the candle when the provider circuit is unhealthy", async () => {
    const { service } = buildService();

    const result = await service.scoreImportedCandle({
      candleId: "candle2",
      instrumentId: "inst1",
      sourceProviderType: "ALPHA_VANTAGE",
      importTimestamp: new Date(),
      processingStartedAt: new Date(),
      passedStructuralValidation: true,
      providerCircuitHealthy: false,
    });

    expect(Number(result.qualityScore)).toBeLessThan(100);
    expect(result.validationStatus).toBe("FLAGGED");
  });

  it("publishes a QualityScoreCalculated event and streams it", async () => {
    const { service, eventPublisher, streamPublisher } = buildService();

    await service.scoreImportedCandle({
      candleId: "candle3",
      instrumentId: "inst1",
      sourceProviderType: "YAHOO_FINANCE",
      importTimestamp: new Date(),
      processingStartedAt: new Date(),
      passedStructuralValidation: true,
    });

    expect(eventPublisher.publish).toHaveBeenCalledWith("QualityScoreCalculated", expect.objectContaining({ candleId: "candle3" }));
    expect(streamPublisher.publish).toHaveBeenCalledWith(
      "market-data:stream:candle",
      "QualityScoreCalculated",
      expect.objectContaining({ candleId: "candle3" }),
    );
  });
});
