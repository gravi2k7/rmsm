import { Injectable } from "@nestjs/common";
import type { IndicatorDefinition } from "../contracts/indicator-definition.interface";
import type { IndicatorRegistry } from "../contracts/indicator-registry.interface";
import type { RegistryValidator as RegistryValidatorContract } from "../contracts/registry-validator.interface";
import {
  DuplicateDefinitionError,
  InvalidVersionError,
  InvalidParameterDefinitionError,
  InvalidCategoryError,
  InvalidDependencyError,
  UnsupportedTimeframeDefinitionError,
  MalformedMetadataError,
} from "../contracts/registry-validation.errors";

const VALID_CATEGORIES = new Set(["TREND", "MOMENTUM", "VOLATILITY", "VOLUME", "MARKET_STRUCTURE", "PATTERN_RECOGNITION", "COMPOSITE", "CUSTOM", "EXPERIMENTAL"]);
const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/;
const VALID_PARAMETER_TYPES = new Set(["integer", "decimal", "boolean", "enum", "string", "timeframe", "symbol", "date"]);
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
 * Real implementation of `contracts/registry-validator.interface.ts` —
 * every check item 8 names, run in one atomic pass (see that
 * interface's own comment for why not 7 separate methods). Notably,
 * `IndicatorRegistryService.register()` calls this BEFORE freezing or
 * storing anything — a definition that fails any check here is never
 * added to the registry at all, not stored-then-marked-invalid.
 */
@Injectable()
export class RegistryValidatorService implements RegistryValidatorContract {
  validate(definition: IndicatorDefinition, registry: IndicatorRegistry): void {
    this.validateMalformedMetadata(definition);
    this.validateVersion(definition);
    this.validateDuplicate(definition, registry);
    this.validateCategory(definition);
    this.validateParameters(definition);
    this.validateTimeframes(definition);
    this.validateDependencies(definition, registry);
  }

  private validateMalformedMetadata(definition: IndicatorDefinition): void {
    if (!definition.identifier || !definition.displayName || !definition.description) {
      throw new MalformedMetadataError("A definition's identifier, displayName, and description must all be non-empty.", { definition });
    }
    if (!definition.metadata) {
      throw new MalformedMetadataError("A definition's metadata field is required.", { definition });
    }
    if (definition.metadata.deterministic !== true) {
      // Not a design a caller can opt out of — Core Principles (Phase 1)
      // require every indicator to be deterministic, full stop; this
      // registry has no concept of a legitimately non-deterministic
      // indicator to accept.
      throw new MalformedMetadataError('A definition\'s metadata.deterministic must be true — this engine has no support for non-deterministic indicators.', { definition });
    }
  }

  private validateVersion(definition: IndicatorDefinition): void {
    if (!SEMVER_PATTERN.test(definition.version)) {
      throw new InvalidVersionError(`"${definition.version}" is not a valid semver (expected "major.minor.patch", e.g. "1.0.0").`, { definition });
    }
  }

  /** A duplicate (identifier, version) PAIR is rejected — the SAME identifier at a NEW version is explicitly supported (item 7), not a duplicate. */
  private validateDuplicate(definition: IndicatorDefinition, registry: IndicatorRegistry): void {
    const existing = registry.listVersions(definition.identifier);
    if (existing.some((d) => d.version === definition.version)) {
      throw new DuplicateDefinitionError(`"${definition.identifier}" is already registered at version "${definition.version}".`, { definition });
    }
  }

  private validateCategory(definition: IndicatorDefinition): void {
    if (!VALID_CATEGORIES.has(definition.category)) {
      throw new InvalidCategoryError(`"${definition.category}" is not a recognized indicator category.`, { definition });
    }
  }

  private validateParameters(definition: IndicatorDefinition): void {
    for (const input of definition.inputs) {
      if (!VALID_PARAMETER_TYPES.has(input.type)) {
        throw new InvalidParameterDefinitionError(`Parameter "${input.name}" has unrecognized type "${input.type}".`, { definition, input });
      }
      if (!input.name) {
        throw new InvalidParameterDefinitionError("A parameter definition's name cannot be empty.", { definition, input });
      }
      if (input.type === "enum" && (!input.allowedValues || input.allowedValues.length === 0)) {
        throw new InvalidParameterDefinitionError(`Enum parameter "${input.name}" must declare at least one allowed value.`, { definition, input });
      }
    }
  }

  private validateTimeframes(definition: IndicatorDefinition): void {
    if (definition.supportedTimeframes.length === 0) {
      throw new UnsupportedTimeframeDefinitionError("A definition must declare at least one supported timeframe.", { definition });
    }
    for (const timeframe of definition.supportedTimeframes) {
      if (!VALID_TIMEFRAMES.has(timeframe)) {
        throw new UnsupportedTimeframeDefinitionError(`"${timeframe}" is not a timeframe AI-101 supports (see AI102_PHASE1_ARCHITECTURE.md's 2m/3m/4m gap).`, { definition, timeframe });
      }
    }
  }

  /** Every dependency identifier must already be registered — a definition cannot depend on something that doesn't exist yet, which also structurally prevents a definition from ever naming itself (directly) as its own dependency, since it isn't registered yet at the moment this check runs. Full transitive-cycle detection (A depends on B depends on A) belongs to the dependency graph (Phase 1's own contract, DependencyGraph.detectCycle — dependency EXECUTION, correctly out of this phase's scope) — this check is registration-time and narrower by design. */
  private validateDependencies(definition: IndicatorDefinition, registry: IndicatorRegistry): void {
    for (const dependencyId of definition.dependencies) {
      const exists = registry.tryGet(dependencyId) !== null;
      if (!exists) {
        throw new InvalidDependencyError(`Dependency "${dependencyId}" (named by "${definition.identifier}") is not registered.`, { definition, dependencyId });
      }
    }
  }
}
