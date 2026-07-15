import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ExchangeResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ description: "IANA timezone identifier, e.g. America/New_York" }) timezone!: string;
  @ApiPropertyOptional() country?: string | null;
  @ApiProperty() isActive!: boolean;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}
