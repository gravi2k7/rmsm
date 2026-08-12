/**
 * FIP-001 (Market Data Platform Production Activation) domain event
 * names — the union of the prompt's own "Events" section list
 * (ImportStarted..DerivedDataGenerated) and Domain 9's "Streaming
 * Pipeline" event list (which names a few of the same events plus
 * TickReceived/CandleReceived/CandleValidated/GapRepaired). Same
 * PascalCase-string convention as MOD005_EVENTS — published through
 * both the existing in-process DomainEventPublisher (for same-process
 * subscribers like WebhookEventBridge-style bridges) and
 * MarketDataStreamPublisher's Redis Streams (for the prompt's
 * explicitly cross-process consumers: Dashboard, Strategy Platform,
 * Risk Platform, AI Platform, Notification Platform).
 */
export const FIP001_EVENTS = {
  PROVIDER_CONNECTED: "ProviderConnected",
  PROVIDER_DISCONNECTED: "ProviderDisconnected",
  IMPORT_STARTED: "ImportStarted",
  IMPORT_COMPLETED: "ImportCompleted",
  IMPORT_FAILED: "ImportFailed",
  INSTRUMENT_MAPPED: "InstrumentMapped",
  TICK_RECEIVED: "TickReceived",
  CANDLE_RECEIVED: "CandleReceived",
  CANDLE_VALIDATED: "CandleValidated",
  GAP_DETECTED: "GapDetected",
  GAP_RESOLVED: "GapResolved",
  GAP_REPAIRED: "GapRepaired",
  QUALITY_SCORE_CALCULATED: "QualityScoreCalculated",
  DERIVED_DATA_GENERATED: "DerivedDataGenerated",
} as const;
