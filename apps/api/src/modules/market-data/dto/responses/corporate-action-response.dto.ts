import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { CorporateActionType } from "@rmsm/database";

export class CorporateActionResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() instrumentId!: string;
  @ApiProperty() type!: CorporateActionType;
  @ApiProperty() effectiveDate!: Date;
  @ApiProperty({ description: "Split ratio or dividend amount, depending on `type` — see AI-101's data model doc." }) value!: string;
  @ApiPropertyOptional() announcedAt?: Date | null;
}
