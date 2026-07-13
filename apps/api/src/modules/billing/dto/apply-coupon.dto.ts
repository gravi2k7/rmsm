import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsUUID } from "class-validator";

export class ApplyCouponDto {
  @ApiProperty()
  @IsString()
  code!: string;

  @ApiProperty()
  @IsUUID()
  invoiceId!: string;
}
