import {
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class CreateTradingAccountDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsString()
  @MaxLength(3)
  currency!: string;

  @IsNumber(
    { maxDecimalPlaces: 8 },
    { message: "startingBalance must be a valid monetary amount" },
  )
  @IsPositive()
  @Min(1)
  startingBalance!: number;

  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: "leverage must be a valid leverage value" },
  )
  @IsPositive()
  @Min(1)
  leverage?: number;

  @IsOptional()
  @IsIn(["DEMO"])
  type?: "DEMO";
}

export class AddTradingFundsDto {
  @IsNumber(
    { maxDecimalPlaces: 8 },
    { message: "amount must be a valid monetary amount" },
  )
  @IsPositive()
  amount!: number;
}
