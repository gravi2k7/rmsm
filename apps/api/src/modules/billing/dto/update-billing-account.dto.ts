import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsObject, IsOptional, IsString } from "class-validator";
import { BillingAddressDto } from "./create-billing-account.dto";

export class UpdateBillingAccountDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  billingEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiPropertyOptional({ type: BillingAddressDto })
  @IsOptional()
  @IsObject()
  address?: BillingAddressDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timezone?: string;
}
