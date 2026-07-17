-- AI-103 Milestone 3 — a real, small gap found while implementing the
-- explicitly-named "UpdateStrategy" use case: STRATEGY_HISTORY_ACTION
-- never had an "updated" value (StrategyHistoryEntry could record a
-- strategy being created, archived, or a version's own lifecycle, but
-- never a plain metadata update). Additive only — no destructive
-- operation, no existing row's own action value is affected.

ALTER TYPE "StrategyHistoryActionType" ADD VALUE 'STRATEGY_UPDATED';
