import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsEnum, IsOptional } from "class-validator";

const LIFECYCLE_STATUSES = ["DRAFT", "TESTING", "PAPER_TRADING", "PRODUCTION", "ARCHIVED"] as const;

/**
 * All fields optional — a `PUT` here is a partial update. Only `status`
 * (lifecycle transition) and `enabled` are included: `Strategy` (the
 * `@rmsm/strategy` aggregate) exposes no rename/re-describe mutation
 * method — `name`/`description` are set once at construction and are
 * immutable afterward by that package's own design, which this phase
 * cannot modify. Accepting `name`/`description` fields here and quietly
 * not applying them would be worse than not offering them at all; a real
 * "rename a strategy" feature needs a domain-layer change first (out of
 * this phase's scope), not an application-layer DTO pretending it works.
 *
 * Risk profile, timeframe, and supported symbols are similarly not
 * editable here even setting the domain constraint aside — an active
 * strategy's own risk/market parameters changing mid-flight is a real
 * decision serious enough to warrant a dedicated new version (see
 * `@rmsm/strategy`'s own `StrategyVersion`), not a casual `PUT`.
 */
export class UpdateStrategyDto {
  @ApiPropertyOptional({ enum: LIFECYCLE_STATUSES, description: "Transitions the strategy's own lifecycle status, if provided." })
  @IsOptional()
  @IsEnum(LIFECYCLE_STATUSES)
  status?: "DRAFT" | "TESTING" | "PAPER_TRADING" | "PRODUCTION" | "ARCHIVED";

  @ApiPropertyOptional({ description: "Enable/disable the strategy, if provided." })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
