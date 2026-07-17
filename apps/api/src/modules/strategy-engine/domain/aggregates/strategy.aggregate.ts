import type { StrategyCategory, StrategyTag } from "../value-objects/strategy-category.value-object";
import { STRATEGY_TAG_PATTERN } from "../value-objects/strategy-category.value-object";
import type { StrategyStatus } from "../value-objects/strategy-status.enum";
import { InvalidStrategyStateError, DuplicateTagError, InvalidTagFormatError } from "../errors/strategy-domain.errors";

/**
 * The top-level identity — "my RSI mean-reversion strategy," the thing
 * a user creates once and iterates on through many `StrategyVersion`s
 * (a separate aggregate, `strategy-version.aggregate.ts`'s own header
 * comment explains why they're split). Organization-scoped
 * (`organizationId`) — a genuine, deliberate architectural difference
 * from AI-101/AI-102, both of which have NO organization scoping at
 * all (ADR-021's own reasoning: market data and indicator DEFINITIONS
 * are global product data). A user-authored trading strategy is the
 * OPPOSITE: private, org-owned business data, structurally identical
 * in kind to EP-003's own organization-scoped entities — the same
 * `organizationId` + cascade-delete relationship pattern this
 * project's own schema has used since EP-003, not AI-101/AI-102's
 * pattern.
 */
export class Strategy {
  private _status: StrategyStatus;
  private _name: string;
  private _description: string;
  private _tags: StrategyTag[];
  private _currentPublishedVersionId: string | null;

  constructor(
    public readonly id: string,
    public readonly organizationId: string,
    name: string,
    description: string,
    public readonly category: StrategyCategory,
    tags: StrategyTag[],
    status: StrategyStatus,
    currentPublishedVersionId: string | null,
    public readonly createdByUserId: string,
    public readonly createdAt: Date,
  ) {
    this._name = name;
    this._description = description;
    this._tags = [...tags];
    this._status = status;
    this._currentPublishedVersionId = currentPublishedVersionId;
  }

  get status(): StrategyStatus {
    return this._status;
  }
  get name(): string {
    return this._name;
  }
  get description(): string {
    return this._description;
  }
  get tags(): readonly StrategyTag[] {
    return this._tags;
  }
  get currentPublishedVersionId(): string | null {
    return this._currentPublishedVersionId;
  }

  rename(name: string): void {
    this.assertActive();
    this._name = name;
  }

  updateDescription(description: string): void {
    this.assertActive();
    this._description = description;
  }

  addTag(tag: StrategyTag): void {
    this.assertActive();
    if (!STRATEGY_TAG_PATTERN.test(tag)) {
      throw new InvalidTagFormatError(`"${tag}" is not a valid tag — lowercase alphanumeric and hyphens only, 1-50 characters.`, { tag });
    }
    if (this._tags.includes(tag)) {
      throw new DuplicateTagError(`"${tag}" is already applied to strategy ${this.id}.`, { strategyId: this.id, tag });
    }
    this._tags = [...this._tags, tag];
  }

  removeTag(tag: StrategyTag): void {
    this.assertActive();
    this._tags = this._tags.filter((t) => t !== tag);
  }

  /**
   * Called once a `StrategyVersion` (a separate aggregate) has
   * actually been published — this aggregate doesn't reach across and
   * mutate the version itself (that would violate the "one transaction
   * touches one aggregate" DDD convention this two-aggregate split was
   * designed around); a real application-service-layer orchestrator
   * (Milestone 3, not built this milestone) is responsible for calling
   * both `StrategyVersion.transitionTo("PUBLISHED")` and this method
   * together, consistently, as its own explicit coordination
   * responsibility — the same "orchestration lives in a service, not
   * inside either aggregate" principle AI-102's own
   * `IndicatorExecutionServiceImpl` embodied for a different pair of
   * collaborating pieces.
   */
  recordPublishedVersion(versionId: string): void {
    this.assertActive();
    this._currentPublishedVersionId = versionId;
  }

  archive(): void {
    if (this._status === "ARCHIVED") {
      throw new InvalidStrategyStateError(`Strategy ${this.id} is already archived.`, { strategyId: this.id });
    }
    this._status = "ARCHIVED";
  }

  private assertActive(): void {
    if (this._status === "ARCHIVED") {
      throw new InvalidStrategyStateError(`Strategy ${this.id} is archived and cannot be modified — no in-place edits to an archived strategy, matching this platform's own established soft-delete convention (the record is preserved, not silently mutable).`, { strategyId: this.id });
    }
  }
}
