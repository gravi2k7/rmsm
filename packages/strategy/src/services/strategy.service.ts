import { ok, err, type Result } from "@rmsm/core";
import type { StrategyRepository } from "../repositories/strategy.repository";
import { StrategyValidatorService } from "./strategy-validator.service";
import type { Strategy, StrategyLifecycleStatus } from "../entities/strategy";
import type { StrategyVersion } from "../entities/strategy-version";
import type { StrategyId } from "../value-objects/strategy-id";
import { UnknownStrategyError, StrategyValidationFailedError, InvalidStrategyLifecycleTransitionError } from "../errors/strategy.errors";

/** Orchestrates strategy lifecycle operations — depends on
 * `StrategyRepository` (an interface, constructor-injected) and
 * `StrategyValidatorService`, never on any concrete persistence
 * technology. */
export class StrategyService {
  constructor(
    private readonly strategyRepository: StrategyRepository,
    private readonly validatorService: StrategyValidatorService,
  ) {}

  async getById(id: StrategyId): Promise<Result<Strategy, UnknownStrategyError>> {
    const strategy = await this.strategyRepository.findById(id);
    if (!strategy) return err(new UnknownStrategyError(id.value));
    return ok(strategy);
  }

  /** Adds a new version to a strategy — validates the version first
   * (via `StrategyValidatorService`) and never persists an invalid one. */
  async addVersion(
    id: StrategyId,
    version: StrategyVersion,
  ): Promise<Result<Strategy, UnknownStrategyError | StrategyValidationFailedError>> {
    const strategyResult = await this.getById(id);
    if (!strategyResult.ok) return strategyResult;

    const validation = this.validatorService.validateVersion(version);
    if (!validation.ok) return validation;

    const strategy = strategyResult.value;
    strategy.addVersion(version);
    await this.strategyRepository.save(strategy);
    return ok(strategy);
  }

  async transitionStatus(
    id: StrategyId,
    next: StrategyLifecycleStatus,
  ): Promise<Result<Strategy, UnknownStrategyError | InvalidStrategyLifecycleTransitionError>> {
    const strategyResult = await this.getById(id);
    if (!strategyResult.ok) return strategyResult;

    const strategy = strategyResult.value;
    try {
      strategy.transitionTo(next);
    } catch (error) {
      if (error instanceof InvalidStrategyLifecycleTransitionError) return err(error);
      throw error;
    }
    await this.strategyRepository.save(strategy);
    return ok(strategy);
  }

  async setEnabled(id: StrategyId, enabled: boolean): Promise<Result<Strategy, UnknownStrategyError>> {
    const strategyResult = await this.getById(id);
    if (!strategyResult.ok) return strategyResult;

    const strategy = strategyResult.value;
    if (enabled) strategy.enable();
    else strategy.disable();
    await this.strategyRepository.save(strategy);
    return ok(strategy);
  }
}
