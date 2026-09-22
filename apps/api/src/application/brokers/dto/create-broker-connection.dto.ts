import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";
import { BrokerProvider } from "@rmsm/database";

export class CreateBrokerConnectionDto {
  @IsEnum(BrokerProvider)
  provider!: BrokerProvider;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name!: string;

  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @IsNotEmpty()
  apiKey!: string;

  @IsOptional()
  @IsString()
  baseUrl?: string;
}
