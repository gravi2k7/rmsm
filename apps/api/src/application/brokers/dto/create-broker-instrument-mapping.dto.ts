import { IsNotEmpty, IsString, IsUUID } from "class-validator";

export class CreateBrokerInstrumentMappingDto {
  @IsUUID()
  instrumentId!: string;

  @IsString()
  @IsNotEmpty()
  brokerSymbol!: string;

  @IsString()
  @IsNotEmpty()
  brokerInstrumentId!: string;
}
