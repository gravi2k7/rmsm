import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { ImportJobStatus } from "@rmsm/database";

export class ImportJobResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() providerId!: string;
  @ApiProperty() jobType!: string;
  @ApiProperty() status!: ImportJobStatus;
  @ApiPropertyOptional() startedAt?: Date | null;
  @ApiPropertyOptional() completedAt?: Date | null;
  @ApiProperty() recordsProcessed!: number;
  @ApiProperty() recordsFailed!: number;
  @ApiPropertyOptional() errorSummary?: string | null;
}
