# AI-101 Phase 2C — Files Changed

## Created (26 files)

**Normalizers (13 new)**
- `apps/api/src/modules/market-data/utils/normalizers/decimal.normalizer.ts`
- `apps/api/src/modules/market-data/utils/normalizers/time.normalizer.ts`
- `apps/api/src/modules/market-data/utils/normalizers/symbol.normalizer.ts`
- `apps/api/src/modules/market-data/utils/normalizers/mapping.utils.ts`
- `apps/api/src/modules/market-data/utils/normalizers/candle.normalizer.ts`
- `apps/api/src/modules/market-data/utils/normalizers/quote.normalizer.ts`
- `apps/api/src/modules/market-data/utils/normalizers/tick.normalizer.ts`
- `apps/api/src/modules/market-data/utils/normalizers/exchange.normalizer.ts`
- `apps/api/src/modules/market-data/utils/normalizers/instrument.normalizer.ts`
- `apps/api/src/modules/market-data/utils/normalizers/instrument-alias.normalizer.ts`
- `apps/api/src/modules/market-data/utils/normalizers/corporate-action.normalizer.ts`
- `apps/api/src/modules/market-data/utils/normalizers/trading-session.normalizer.ts`
- `apps/api/src/modules/market-data/utils/normalizers/trading-calendar-metadata.normalizer.ts`
- `apps/api/src/modules/market-data/utils/normalizers/provider-metadata.normalizer.ts`

**Validation (8 new)**
- `apps/api/src/modules/market-data/validation/errors/market-data-validation.error.ts`
- `apps/api/src/modules/market-data/validation/candle.validator.ts`
- `apps/api/src/modules/market-data/validation/tick.validator.ts`
- `apps/api/src/modules/market-data/validation/quote.validator.ts`
- `apps/api/src/modules/market-data/validation/reference-data.validator.ts`
- `apps/api/src/modules/market-data/validation/provider-data.validator.ts`
- `apps/api/src/modules/market-data/validation/duplicate-detector.ts`
- `apps/api/src/modules/market-data/validation/data-quality-rules.ts`

**Tests (8 new)**
- `apps/api/src/modules/market-data/utils/__tests__/decimal.normalizer.spec.ts`
- `apps/api/src/modules/market-data/utils/__tests__/time.normalizer.spec.ts`
- `apps/api/src/modules/market-data/utils/__tests__/symbol.normalizer.spec.ts`
- `apps/api/src/modules/market-data/utils/__tests__/candle.normalizer.spec.ts`
- `apps/api/src/modules/market-data/validation/__tests__/candle.validator.spec.ts`
- `apps/api/src/modules/market-data/validation/__tests__/quote.validator.spec.ts`
- `apps/api/src/modules/market-data/validation/__tests__/duplicate-detector.spec.ts`
- `apps/api/src/modules/market-data/validation/__tests__/data-quality-rules.spec.ts`

**Documentation (3 new)**
- `docs/rmsm-ai/AI_101_MARKET_DATA_PHASE_2C_NORMALIZATION_VALIDATION.md`
- `docs/rmsm-ai/AI_101_VALIDATION_RULES.md`
- `docs/rmsm-ai/AI_101_MARKET_DATA_PHASE_2C_FILES_CHANGED.md` (this file)

## Modified (2 files)

- `docs/rmsm-ai/AI_101_CHANGELOG.md` — Phase 2C section prepended
- `docs/ARCHITECTURE_DECISIONS.md` — ADR-027, ADR-028 added

## Deleted (2 files)

- `apps/api/src/modules/market-data/validation/README.md` — deferral marker, removed
- `apps/api/src/modules/market-data/utils/README.md` — deferral marker, removed

## Not Touched

Zero files outside `apps/api/src/modules/market-data/` and the two shared documentation files
listed above. No EP module file, no `schema.prisma` change (Phase 2C is normalization/validation
infrastructure only — no new database entities), no Phase 2A repository or Phase 2B provider
file modified.
