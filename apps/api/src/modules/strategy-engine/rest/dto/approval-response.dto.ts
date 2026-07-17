import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ApprovalResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() strategyVersionId!: string;
  @ApiProperty() requestedByUserId!: string;
  @ApiProperty() requestedAt!: Date;
  @ApiProperty({ enum: ["PENDING", "APPROVED", "REJECTED"] }) decision!: string;
  @ApiPropertyOptional() decidedByUserId?: string;
  @ApiPropertyOptional() decidedAt?: Date;
  @ApiPropertyOptional() comments?: string;
}
