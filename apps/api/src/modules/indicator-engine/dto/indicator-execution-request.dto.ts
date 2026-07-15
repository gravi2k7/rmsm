import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsISO8601, IsObject, IsOptional, IsString, IsUUID } from "class-validator";

/** Shape for a future POST/GET indicator-execution endpoint (Phase 3+ equivalent — no controller exists yet, matching AI-101 Phase 1's own precedent of preparing DTOs before any controller uses them). Mirrors contracts/indicator-execution.interface.ts's IndicatorExecutionRequest field-for-field — this is that same shape with class-validator decorations, not a different design. */
export class IndicatorExecutionRequestDto {
  @ApiProperty()
  @IsString()
  indicatorIdentifier!: string;

  @ApiProperty()
  @IsUUID()
  instrumentId!: string;

  @ApiProperty({ description: "One of AI-101's CandleInterval values — see contracts/timeframe.ts for the 2m/3m/4m gap this module cannot yet support." })
  @IsString()
  timeframe!: string;

  @ApiPropertyOptional({ description: "Indicator-specific named parameters, e.g. { period: 14 } for RSI." })
  @IsOptional()
  @IsObject()
  parameters?: Record<string, number | string | boolean>;

  @ApiProperty({ description: "ISO 8601, UTC" })
  @IsISO8601()
  from!: string;

  @ApiProperty({ description: "ISO 8601, UTC" })
  @IsISO8601()
  to!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  allowIncremental?: boolean = true;
}
