import { IsNotEmpty, IsString, IsUUID } from "class-validator";

export class BindBrokerAccountDto {
  @IsUUID()
  tradingAccountId!: string;

  @IsString()
  @IsNotEmpty()
  brokerAccountId!: string;
}
