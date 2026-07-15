import { ApiProperty } from "@nestjs/swagger";

export class ProviderHealthEntryDto {
  @ApiProperty() type!: string;
  @ApiProperty() enabled!: boolean;
  @ApiProperty({ enum: ["closed", "open", "half_open"] }) circuitState!: "closed" | "open" | "half_open";
}

export class SynchronizationHealthResponseDto {
  @ApiProperty({ enum: ["ok", "degraded"] }) status!: "ok" | "degraded";
  @ApiProperty({ description: "All-time count, not a rolling window — see MarketDataAdminService's own comment for why." }) totalFailedImportCount!: number;
  @ApiProperty({ type: [ProviderHealthEntryDto], description: "Phase 5 addition — per-provider circuit-breaker state, a genuinely live signal (unlike totalFailedImportCount)." })
  providers!: ProviderHealthEntryDto[];
  @ApiProperty({ enum: ["ok", "error"], description: "Phase 5 addition — direct database connectivity check." }) database!: "ok" | "error";
}
