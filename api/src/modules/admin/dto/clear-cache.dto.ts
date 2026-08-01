import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class ClearCacheDto {
  @ApiProperty({ description: "Key prefix to clear — clearing the whole cache is not supported." })
  @IsString()
  @MinLength(1)
  prefix!: string;
}
