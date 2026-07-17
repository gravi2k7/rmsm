import { ApiProperty } from "@nestjs/swagger";

export class ValidationFindingDto {
  @ApiProperty({ enum: ["ERROR", "WARNING"] }) severity!: string;
  @ApiProperty() code!: string;
  @ApiProperty() message!: string;
  @ApiProperty({ required: false }) nodeId?: string;
}

export class ValidationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() strategyVersionId!: string;
  @ApiProperty() ranAt!: Date;
  @ApiProperty() passed!: boolean;
  @ApiProperty({ type: [ValidationFindingDto] }) findings!: ValidationFindingDto[];
}
