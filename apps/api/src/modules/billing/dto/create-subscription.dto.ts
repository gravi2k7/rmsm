import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsEnum, IsOptional, IsString } from "class-validator";

const BILLING_CYCLE_VALUES = ["MONTHLY", "YEARLY"] as const;
const PROVIDER_VALUES = ["STRIPE", "MOCK", "RAZORPAY", "PADDLE", "LEMONSQUEEZY", "PAYPAL"] as const;

export class CreateSubscriptionDto {
  @ApiProperty({ example: "professional" })
  @IsString()
  planKey!: string;

  @ApiProperty({ enum: BILLING_CYCLE_VALUES })
  @IsEnum(BILLING_CYCLE_VALUES)
  billingCycle!: (typeof BILLING_CYCLE_VALUES)[number];

  @ApiProperty()
  @IsEmail()
  billingEmail!: string;

  @ApiPropertyOptional({ enum: PROVIDER_VALUES, default: "MOCK" })
  @IsOptional()
  @IsEnum(PROVIDER_VALUES)
  provider?: (typeof PROVIDER_VALUES)[number];
}
