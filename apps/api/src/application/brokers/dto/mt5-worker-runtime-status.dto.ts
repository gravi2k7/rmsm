import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class Mt5WorkerRuntimeStatusDto {
  @IsIn(["ACTIVE", "DRAINING", "OFFLINE"])
  status!: "ACTIVE" | "DRAINING" | "OFFLINE";

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  lastError?: string | null;
}
