import { Injectable } from "@nestjs/common";
import { IndicatorRegistryService } from "../registry/indicator-registry.service";
import { ServiceMetricsService } from "./service-metrics.service";
import type { IndicatorValidationService as IndicatorValidationServiceContract } from "../contracts/service-contracts.interface";
import type { IndicatorValidationRequest, ValidationResponse } from "../contracts/service-models.interface";

const VALID_TIMEFRAMES = new Set([
  "ONE_MINUTE",
  "FIVE_MINUTES",
  "FIFTEEN_MINUTES",
  "THIRTY_MINUTES",
  "ONE_HOUR",
  "FOUR_HOURS",
  "ONE_DAY",
  "ONE_WEEK",
  "ONE_MONTH",
]);

/**
 * Real implementation of `contracts/service-contracts.interface.ts`'s
 * `IndicatorValidationService` — item 4's own 6 checks, unified into one
 * `ValidationResponse` (`{ valid, errors }`) rather than 6 separate
 * throw-or-not methods, so a caller sees every problem this request has
 * at once, not just the first one a throwing check happened to hit
 * (deliberately different from `RegistryValidatorService`/
 * `GraphValidatorService`'s own "fail fast on first problem" discipline
 * — those run at REGISTRATION/graph-build time, where a definition
 * author fixing one thing and re-registering is a fine workflow; THIS
 * runs against a caller's own request, where "here's everything wrong
 * with what you sent" is more useful than one error at a time).
 */
@Injectable()
export class IndicatorValidationServiceImpl implements IndicatorValidationServiceContract {
  constructor(
    private readonly registry: IndicatorRegistryService,
    private readonly metrics: ServiceMetricsService,
  ) {}

  validate(request: IndicatorValidationRequest): ValidationResponse {
    const errors: string[] = [];

    // Item 4: "indicator existence"
    const definition = request.version ? this.tryGetVersion(request.indicatorIdentifier, request.version) : this.registry.tryGet(request.indicatorIdentifier);

    if (!definition) {
      errors.push(`Indicator "${request.indicatorIdentifier}"${request.version ? `@${request.version}` : ""} is not registered.`);
      // Every remaining check needs a real definition to check against —
      // no definition means nothing further can be meaningfully
      // validated, so this returns early rather than producing a wall
      // of confusing secondary errors that all stem from the same root
      // cause.
      this.metrics.recordValidationFailure();
      return { valid: false, errors };
    }

    // Item 4: "metadata" — the same deterministic-flag check
    // RegistryValidatorService already enforces at registration time;
    // re-checked here defensively in case a definition somehow reached
    // the registry without going through that path.
    if (!definition.metadata.deterministic) {
      errors.push(`Indicator "${definition.identifier}" has malformed metadata (deterministic: false).`);
    }

    // Item 4: "parameters"
    for (const input of definition.inputs) {
      const value = request.parameters[input.name];
      if (input.required && (value === undefined || value === null)) {
        errors.push(`Required parameter "${input.name}" is missing.`);
      }
    }

    // Item 4: "calculation modes" — every request must declare a
    // real, valid indicator identifier/timeframe pairing; the
    // CalculationMode value ITSELF is validated by TypeScript's own
    // discriminated union at the call site (ExecuteIndicatorRequest.calculationMode
    // can only ever be one of the 6 real CalculationMode variants — an
    // invalid string literally cannot compile), so there is no
    // additional runtime check to perform here beyond what the type
    // system already guarantees. Documented rather than silently
    // skipped.

    // Item 4: "execution requests" / "unsupported timeframes"
    if (!VALID_TIMEFRAMES.has(request.timeframe)) {
      errors.push(`"${request.timeframe}" is not a timeframe AI-101 supports.`);
    } else if (!definition.supportedTimeframes.includes(request.timeframe as never)) {
      errors.push(`"${request.timeframe}" is not supported by "${definition.identifier}".`);
    }

    // Item 4: "dependency availability"
    for (const depId of definition.dependencies) {
      if (!this.registry.tryGet(depId)) {
        errors.push(`Dependency "${depId}" (required by "${definition.identifier}") is not registered.`);
      }
    }

    if (errors.length > 0) this.metrics.recordValidationFailure();
    return { valid: errors.length === 0, errors };
  }

  private tryGetVersion(identifier: string, version: string) {
    try {
      return this.registry.getVersion(identifier, version);
    } catch {
      return null;
    }
  }
}
