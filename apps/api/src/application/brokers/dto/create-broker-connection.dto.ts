import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from "class-validator";
import { BrokerProvider } from "@rmsm/database";

export class CreateBrokerConnectionDto {
  @IsEnum(BrokerProvider)
  provider!: BrokerProvider;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name!: string;

  @ValidateIf(
    (dto) =>
      dto.provider === BrokerProvider.PROJECTX ||
      dto.provider === BrokerProvider.TRADOVATE,
  )
  @IsString()
  @IsNotEmpty()
  username?: string;

  @ValidateIf((dto) => dto.provider === BrokerProvider.PROJECTX)
  @IsString()
  @IsNotEmpty()
  apiKey?: string;

  @ValidateIf(
    (dto) =>
      dto.provider === BrokerProvider.PROJECTX ||
      dto.provider === BrokerProvider.TRADOVATE,
  )
  @IsOptional()
  @IsString()
  baseUrl?: string;

  @ValidateIf((dto) => dto.provider === BrokerProvider.MT5)
  @IsString()
  @IsNotEmpty()
  login?: string;

  @ValidateIf(
    (dto) =>
      dto.provider === BrokerProvider.MT5 ||
      dto.provider === BrokerProvider.TRADOVATE,
  )
  @IsString()
  @IsNotEmpty()
  password?: string;

  @ValidateIf((dto) => dto.provider === BrokerProvider.MT5)
  @IsString()
  @IsNotEmpty()
  server?: string;

  @ValidateIf((dto) => dto.provider === BrokerProvider.CTRADER)
  @IsString()
  @IsNotEmpty()
  clientId?: string;

  @ValidateIf((dto) => dto.provider === BrokerProvider.CTRADER)
  @IsString()
  @IsNotEmpty()
  clientSecret?: string;

  @ValidateIf((dto) => dto.provider === BrokerProvider.CTRADER)
  @IsString()
  @IsNotEmpty()
  accessToken?: string;

  @ValidateIf((dto) => dto.provider === BrokerProvider.CTRADER)
  @IsString()
  @IsNotEmpty()
  accountId?: string;

}
