import { Injectable } from "@nestjs/common";
import type { Strategy } from "@rmsm/strategy";
import { StrategyResponseDto } from "../dto/strategy-response.dto";

/**
 * DTO ↓ Application Model ↓ Domain ↓ DTO, per Phase 4A's own required
 * mapping layer. "Application Model" here is intentionally the same
 * shape as the DTO for `Strategy` (no separate intermediate class) —
 * `CreateStrategyDto`'s own fields already match `StrategyFactory`'s own
 * `RawStrategyInput` closely enough that inserting a third shape between
 * them would just be relabeling, not adding a real transformation step.
 * The mapper's own job is exactly the two directions that DO need real
 * transformation: raw DTO fields into value-object-bearing domain input,
 * and a domain aggregate back into a flat, JSON-safe response shape.
 */
@Injectable()
export class StrategyMapper {
  toResponseDto(strategy: Strategy): StrategyResponseDto {
    const dto = new StrategyResponseDto();
    dto.id = strategy.id.value;
    dto.name = strategy.name;
    dto.description = strategy.description;
    dto.status = strategy.status;
    dto.enabled = strategy.enabled;
    dto.riskTolerance = strategy.riskProfile.tolerance;
    dto.maxRiskPerTrade = strategy.riskProfile.maxRiskPerTrade;
    dto.maxLeverage = strategy.riskProfile.maxLeverage;
    dto.maxOpenPositions = strategy.riskProfile.maxOpenPositions;
    dto.timeframe = strategy.timeframe;
    dto.supportedSymbols = strategy.supportedSymbols.map((s) => s.value);
    dto.versionCount = strategy.versions.length;
    return dto;
  }

  toResponseDtoList(strategies: readonly Strategy[]): StrategyResponseDto[] {
    return strategies.map((s) => this.toResponseDto(s));
  }
}
