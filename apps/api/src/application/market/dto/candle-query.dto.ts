import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { Type } from "class-transformer";
import { Timeframe } from "@rmsm/market";

/**
 * A single combined DTO for `GET /candles` — deliberately *not* two
 * separate `@Query()`-bound DTOs (`CandleQueryDto` + the shared
 * `PaginationQueryDto`) on the same controller method. That pattern
 * looks like it should work (each DTO gets its own independent
 * validation pass against the same raw query object) but doesn't once
 * `ValidationPipe`'s `forbidNonWhitelisted: true` is in play (as it is
 * globally, in `main.ts`): each DTO's own whitelist check rejects the
 * *other* DTO's fields as unrecognized, since neither DTO declares them.
 * A real integration test caught this — `GET /candles?symbolCode=...&
 * timeframe=...` was 400ing even with fully valid input — before it
 * shipped. One DTO with every field this endpoint actually accepts is
 * the correct fix, not a workaround.
 */
export class CandleQueryDto {
  @ApiProperty({ example: "EURUSD" })
  @IsString()
  symbolCode!: string;

  @ApiProperty({ enum: Timeframe, example: Timeframe.H1 })
  @IsEnum(Timeframe)
  timeframe!: Timeframe;

  @ApiPropertyOptional({ description: "ISO 8601 — defaults to 24 hours before `to`." })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: "ISO 8601 — defaults to now." })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 500, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  pageSize?: number = 50;
}
