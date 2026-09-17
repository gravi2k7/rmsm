import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNumber, IsPositive, IsUUID } from "class-validator";

export class ManualOrderDto {
  @ApiProperty({
    description: "Canonical RMSM instrument id.",
    example: "1bf3572c-4c3f-47ba-a819-096f691e43a5",
  })
  @IsUUID()
  instrumentId!: string;

  @ApiProperty({ enum: ["BUY", "SELL"] })
  @IsIn(["BUY", "SELL"])
  side!: "BUY" | "SELL";

  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsPositive()
  quantityUnits!: number;
}
