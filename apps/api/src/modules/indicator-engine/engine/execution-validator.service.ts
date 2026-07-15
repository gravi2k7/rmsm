import { Injectable } from "@nestjs/common";
import type { ExecutionContext } from "../contracts/execution-context.interface";
import type { ExecutionRequest } from "../contracts/execution-request.interface";
import type { ExecutionValidator as ExecutionValidatorContract } from "../contracts/execution-validator.interface";
import type { IndicatorLifecycleState } from "../contracts/indicator-lifecycle.interface";
import { LIFECYCLE_TRANSITIONS } from "../contracts/indicator-lifecycle.interface";
import {
  UnsupportedTimeframeException,
  InvalidParameterException,
  CalculationWindowException,
  ExecutionCancelledException,
  ExecutionTimeoutException,
} from "../contracts/execution.errors";

/**
 * Real implementation of `contracts/execution-validator.interface.ts` —
 * every check item 8 names. Deliberately re-checks timeframe/parameters
 * at the CONTEXT level (not just trusting that request-time validation,
 * Phase 1's `IndicatorValidator`, already covered it) — see that
 * interface's own comment for why this redundancy is intentional, not
 * wasted work.
 */
@Injectable()
export class ExecutionValidatorService implements ExecutionValidatorContract {
  validateContext(context: ExecutionContext): void {
    if (!context.executionId || !context.indicatorInstance || !context.indicatorDefinition) {
      throw new CalculationWindowException("Execution context is missing required fields (executionId, indicatorInstance, or indicatorDefinition).", { context });
    }
  }

  validateMarketDataPresence(context: ExecutionContext): void {
    if (context.marketDataReference.candles.length === 0) {
      throw new CalculationWindowException(`No market data available for instrument "${context.marketDataReference.instrumentId}" over the requested range.`, { context });
    }
    if (context.marketDataReference.candles.length < context.indicatorDefinition.minimumLookback) {
      throw new CalculationWindowException(
        `Only ${context.marketDataReference.candles.length} candles available; "${context.indicatorDefinition.identifier}" requires at least ${context.indicatorDefinition.minimumLookback}.`,
        { context },
      );
    }
  }

  validateTimeframe(context: ExecutionContext): void {
    if (!context.indicatorDefinition.supportedTimeframes.includes(context.timeframe)) {
      throw new UnsupportedTimeframeException(`"${context.timeframe}" is not supported by "${context.indicatorDefinition.identifier}".`, { context });
    }
  }

  validateParameters(context: ExecutionContext): void {
    for (const input of context.indicatorDefinition.inputs) {
      const value = context.parameters[input.name];
      if (input.required && (value === undefined || value === null)) {
        throw new InvalidParameterException(`Required parameter "${input.name}" is missing.`, { context, parameterName: input.name });
      }
    }
  }

  validateLifecycleTransition(from: IndicatorLifecycleState, to: IndicatorLifecycleState): void {
    if (!LIFECYCLE_TRANSITIONS[from].includes(to)) {
      throw new CalculationWindowException(`Invalid lifecycle transition from "${from}" to "${to}".`, { from, to });
    }
  }

  validateNotCancelled(request: ExecutionRequest): void {
    if (request.executionOptions.cancellationSignal?.aborted) {
      throw new ExecutionCancelledException("Execution was cancelled before it could complete.", { request });
    }
  }

  validateTimeoutConfiguration(request: ExecutionRequest): void {
    const timeoutMs = request.executionOptions.timeoutMs;
    if (timeoutMs !== undefined && timeoutMs <= 0) {
      throw new ExecutionTimeoutException(`timeoutMs must be positive; got ${timeoutMs}.`, { request });
    }
  }
}
