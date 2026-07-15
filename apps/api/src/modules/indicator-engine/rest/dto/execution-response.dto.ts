import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ExecutionStatusDto } from "./execution-status.dto";

export class ExecutionResponseDto {
  @ApiProperty({ type: ExecutionStatusDto }) summary!: ExecutionStatusDto;
  @ApiPropertyOptional({ type: "object", description: "The root indicator's own computed result — present only when status is COMPLETED." })
  result?: unknown;
  @ApiProperty({ type: "object", description: "Every step's own result (root + dependencies), keyed by identifier — present even on partial failure." })
  stepResults!: Record<string, unknown>;
  @ApiProperty({ type: [String] }) errors!: string[];
}
