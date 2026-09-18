import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from "class-validator";

export class PlaceOrderDto {
  @IsUUID()
  instrumentId!: string;

  @IsIn(["BUY", "SELL"])
  side!: "BUY" | "SELL";

  @IsOptional()
  @IsIn(["MARKET", "LIMIT", "STOP", "STOP_LIMIT"])
  type?: "MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT";

  @IsString()
  @IsNotEmpty()
  @Matches(/^(?:0|[1-9]\d*)(?:\.\d+)?$/, {
    message: "quantity must be a positive decimal string",
  })
  quantity!: string;

  @IsOptional()
  @IsString()
  @Matches(/^(?:0|[1-9]\d*)(?:\.\d+)?$/, {
    message: "limitPrice must be a valid decimal string",
  })
  limitPrice?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(?:0|[1-9]\d*)(?:\.\d+)?$/, {
    message: "stopPrice must be a valid decimal string",
  })
  stopPrice?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(?:0|[1-9]\d*)(?:\.\d+)?$/, {
    message: "stopLossPrice must be a valid decimal string",
  })
  stopLossPrice?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(?:0|[1-9]\d*)(?:\.\d+)?$/, {
    message: "takeProfitPrice must be a valid decimal string",
  })
  takeProfitPrice?: string;
}
