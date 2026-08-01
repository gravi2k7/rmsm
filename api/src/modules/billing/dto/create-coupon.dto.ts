import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsEnum, IsISO8601, IsInt, IsNumber, IsOptional, IsString, IsUUID, Min } from "class-validator";

const COUPON_TYPE_VALUES = ["PERCENTAGE", "FIXED"] as const;

/** Module 005 addition — Domain 2's "Coupon Management" admin create endpoint (CouponService.createCoupon already existed; nothing exposed it over HTTP). */
export class CreateCouponDto {
  @ApiProperty()
  @IsString()
  code!: string;

  @ApiProperty({ enum: COUPON_TYPE_VALUES })
  @IsEnum(COUPON_TYPE_VALUES)
  type!: (typeof COUPON_TYPE_VALUES)[number];

  @ApiProperty()
  @IsNumber()
  value!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  expiresAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  maxRedemptions?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
