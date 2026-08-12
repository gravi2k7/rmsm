import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class EnableMaintenanceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  message?: string;
}
