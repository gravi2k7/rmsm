import { ApiProperty } from "@nestjs/swagger";

export class VersionResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() strategyId!: string;
  @ApiProperty() versionNumber!: number;
  @ApiProperty({ enum: ["DRAFT", "PENDING_VALIDATION", "VALIDATED", "PENDING_APPROVAL", "APPROVED", "REJECTED", "PUBLISHED", "SUPERSEDED"] }) status!: string;
  @ApiProperty({ type: "object" }) entryRules!: unknown;
  @ApiProperty({ type: "object" }) exitRules!: unknown;
  @ApiProperty({ type: "array", items: { type: "object" } }) parameters!: unknown[];
  @ApiProperty() createdByUserId!: string;
  @ApiProperty() createdAt!: Date;
}
