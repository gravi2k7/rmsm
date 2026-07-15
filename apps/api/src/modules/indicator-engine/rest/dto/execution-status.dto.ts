import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/** Item 1's own "execution status" endpoint — a lighter-weight view of an ExecutionResponseDto's own summary, for a caller that only wants to know whether a previously-submitted execution finished, not its full result payload again. */
export class ExecutionStatusDto {
  @ApiProperty() executionId!: string;
  @ApiProperty({ enum: ["COMPLETED", "FAILED", "CANCELLED"] }) status!: string;
  @ApiProperty() durationMs!: number;
  @ApiPropertyOptional() errorCount?: number;
}
