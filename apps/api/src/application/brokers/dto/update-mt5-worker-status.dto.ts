import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { Mt5WorkerStatus } from "@rmsm/database";

export class UpdateMt5WorkerStatusDto {
  @IsEnum(Mt5WorkerStatus)
  status!: Mt5WorkerStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  lastError?: string | null;
}
