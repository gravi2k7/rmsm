import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";
import { Type } from "class-transformer";

export class InstrumentProviderSearchDto {
  @ApiProperty({
    description: "Active market-data provider configuration to search.",
  })
  @IsUUID()
  providerConfigId!: string;

  @ApiProperty({
    description: "Provider symbol/name search query.",
    example: "XAU",
  })
  @IsString()
  query!: string;

  @ApiPropertyOptional({
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
