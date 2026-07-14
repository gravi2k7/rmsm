# synchronization/

Deliberately empty, still. This is NOT the same thing as
`services/synchronization.service.ts` (Phase 3) — that file holds the sync *decision logic*
("does this instrument need a sync, for what range"), which is genuinely built and tested.

This folder is reserved for the actual scheduler/queue-worker infrastructure that would call
that decision logic periodically — BullMQ repeatable jobs, cron registration, an
`OnModuleInit` trigger, the equivalent of Module 005's `NotificationCronRegistrar`. Phase 3's
explicit scope excluded "background schedulers beyond orchestration," so none of that exists
yet. When it's built, it belongs here, calling into
`SynchronizationService.synchronizeInstrument()` — not duplicating that logic.

See `docs/rmsm-ai/AI_101_MARKET_DATA_PHASE_3_SERVICE_LAYER.md` for the full reasoning behind
this split (ADR-029).
