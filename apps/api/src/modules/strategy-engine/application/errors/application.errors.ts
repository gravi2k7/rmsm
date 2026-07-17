/**
 * The 8th standardized error hierarchy in this platform now (see
 * AI-102's own comment chain for the first 6; `strategy-domain.errors.ts`
 * was the 7th). This one answers "what went wrong orchestrating a use
 * case" — the layer above the domain (which enforces its own
 * invariants via `StrategyDomainError`) and above persistence (which
 * has no error hierarchy of its own — repository methods either
 * succeed or throw a generic `Error`, matching AI-102's own repository
 * convention). `IndicatorExceptionFilter` (AI-102 Phase 4) is the
 * direct precedent for mapping this hierarchy to HTTP status codes.
 */
export abstract class StrategyApplicationError extends Error {
  abstract readonly code: string;
  readonly context: Record<string, unknown>;
  constructor(message: string, context: Record<string, unknown> = {}) {
    super(message);
    this.name = new.target.name;
    this.context = context;
  }
}

export class StrategyNotFoundException extends StrategyApplicationError {
  readonly code = "StrategyNotFound";
}
export class StrategyVersionNotFoundException extends StrategyApplicationError {
  readonly code = "StrategyVersionNotFound";
}
export class DuplicateSlugException extends StrategyApplicationError {
  readonly code = "DuplicateSlug";
}
export class NoPendingApprovalException extends StrategyApplicationError {
  readonly code = "NoPendingApproval";
}
export class VersionNotApprovedException extends StrategyApplicationError {
  readonly code = "VersionNotApproved";
}
export class ValidationFailedException extends StrategyApplicationError {
  readonly code = "ValidationFailed";
}
