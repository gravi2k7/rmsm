import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsObject, IsOptional, IsString } from "class-validator";

export class BillingAddressDto {
  @ApiProperty()
  @IsString()
  line1!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  line2?: string;

  @ApiProperty()
  @IsString()
  city!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty()
  @IsString()
  postalCode!: string;
}

export class CreateBillingAccountDto {
  @ApiProperty()
  @IsEmail()
  billingEmail!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({ description: "GST/VAT/Tax ID" })
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiPropertyOptional({ type: BillingAddressDto })
  @IsOptional()
  @IsObject()
  address?: BillingAddressDto;

  @ApiProperty({ example: "US" })
  @IsString()
  country!: string;

  @ApiPropertyOptional({ example: "USD" })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: "UTC" })
  @IsOptional()
  @IsString()
  timezone?: string;
}
