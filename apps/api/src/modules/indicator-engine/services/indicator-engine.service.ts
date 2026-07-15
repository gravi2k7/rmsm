import { Injectable } from "@nestjs/common";
import { IndicatorQueryServiceImpl } from "./indicator-query.service";
import { IndicatorExecutionServiceImpl } from "./indicator-execution.service";
import { IndicatorValidationServiceImpl } from "./indicator-validation.service";
import { IndicatorLifecycleServiceImpl } from "./indicator-lifecycle.service";
import type { IndicatorEngineService as IndicatorEngineServiceContract } from "../contracts/service-contracts.interface";
import type {
  ExecuteIndicatorRequest,
  QueryIndicatorRequest,
  IndicatorValidationRequest,
  IndicatorExecutionResponse,
  IndicatorListResponse,
  IndicatorMetadataResponse,
  ValidationResponse,
} from "../contracts/service-models.interface";

/**
 * **The single public entry point into AI-102** — this phase's own
 * explicit recommendation, implemented literally. Every future
 * consumer (AI-103, AI-104, AI-105, AI-106, AI-109, per this phase's
 * own architecture diagram) imports and calls ONLY this class — never
 * `IndicatorRegistryService`, `DependencyGraphBuilderService`,
 * `ExecutionPlannerService`, or `ComputationEngineService` directly
 * (item 6's own explicit rule). This class's constructor is the ONLY
 * place in this module where those four are ever assembled together;
 * everything below is a one-line delegation to the internal service
 * that actually owns each concern (`IndicatorQueryServiceImpl`,
 * `IndicatorExecutionServiceImpl`, `IndicatorValidationServiceImpl`) —
 * this class itself contains no orchestration logic of its own beyond
 * that delegation, by design (the orchestration logic lives in
 * `IndicatorExecutionServiceImpl`, testable on its own).
 *
 * `ExecutionFacade` (item 6) and `IndicatorEngineService` (item 1) are
 * the same interface — `contracts/service-contracts.interface.ts`'s own
 * header comment has the full reasoning for why this class implements
 * only one, not two.
 */
@Injectable()
export class IndicatorEngineServiceImpl implements IndicatorEngineServiceContract {
  constructor(
    private readonly queryService: IndicatorQueryServiceImpl,
    private readonly executionService: IndicatorExecutionServiceImpl,
    private readonly validationService: IndicatorValidationServiceImpl,
    private readonly lifecycleService: IndicatorLifecycleServiceImpl,
  ) {}

  async execute(request: ExecuteIndicatorRequest): Promise<IndicatorExecutionResponse> {
    this.lifecycleService.markExecuting();
    try {
      return await this.executionService.execute(request);
    } finally {
      this.lifecycleService.markReady();
    }
  }

  query(request: QueryIndicatorRequest): IndicatorListResponse {
    return this.queryService.list(request);
  }

  lookup(identifier: string, version?: string): IndicatorMetadataResponse {
    return this.queryService.lookup(identifier, version);
  }

  validate(request: IndicatorValidationRequest): ValidationResponse {
    return this.validationService.validate(request);
  }
}
