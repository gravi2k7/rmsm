import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class ApproveDecisionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comments?: string;
}

export class RejectDecisionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comments?: string;
}

export class RiskCheckResponseDto {
  @ApiProperty() passed!: boolean;
  @ApiProperty({ required: false }) message?: string;
}

export class DecisionResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() opportunityId!: string;
  @ApiProperty({ enum: ["PENDING", "APPROVED", "REJECTED", "MANUAL_REVIEW"] }) status!: string;
  @ApiProperty() riskScore!: number;
  @ApiProperty() riskPassed!: boolean;
  @ApiProperty({ type: [String] }) failedRiskChecks!: string[];
  @ApiProperty() positionSizeUnits!: number;
  @ApiProperty() positionSizeBasis!: string;
  @ApiProperty({ required: false }) decidedBy?: string;
  @ApiProperty({ required: false }) decidedAt?: string;
  @ApiProperty() createdAt!: string;
}

export class DecisionListResponseDto {
  @ApiProperty({ type: [DecisionResponseDto] }) items!: DecisionResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
