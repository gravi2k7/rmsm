import { ApiProperty } from "@nestjs/swagger";

export class SynchronizationHealthResponseDto {
  @ApiProperty({ enum: ["ok", "degraded"] }) status!: "ok" | "degraded";
  @ApiProperty({ description: "All-time count, not a rolling window — see MarketDataAdminService's own comment for why." }) totalFailedImportCount!: number;
}
