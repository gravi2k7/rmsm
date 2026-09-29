import {
  IsNotEmpty,
  IsString,
  IsUrl,
  MaxLength,
} from "class-validator";

export class CreateMt5WorkerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  workerKey!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @IsUrl({ require_tld: false })
  @MaxLength(500)
  gatewayUrl!: string;
}
