import { ApiProperty } from "@nestjs/swagger";

export class ModelInfoDto {
  @ApiProperty() model!: string;
  @ApiProperty() providerType!: string;
  @ApiProperty() maxContextTokens!: number;
  @ApiProperty() supportsFunctionCalling!: boolean;
}

export class ProviderCapabilitiesDto {
  @ApiProperty() chat!: boolean;
  @ApiProperty() streaming!: boolean;
  @ApiProperty() embedding!: boolean;
  @ApiProperty() moderation!: boolean;
  @ApiProperty() maxContextTokens!: number;
  @ApiProperty() supportsFunctionCalling!: boolean;
}

export class ProviderInfoDto {
  @ApiProperty() type!: string;
  @ApiProperty() enabled!: boolean;
  @ApiProperty({ type: ProviderCapabilitiesDto }) capabilities!: ProviderCapabilitiesDto;
}
