import {
  IsBoolean,
  IsEnum,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from "class-validator";
import { CopyGroupStatus, CopyMemberRole } from "@rmsm/database";

export class CreateCopyGroupDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsUUID()
  masterAccountId!: string;
}

export class UpdateCopyGroupDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsEnum(CopyGroupStatus)
  status?: CopyGroupStatus;
}

export class AddCopyGroupMemberDto {
  @IsUUID()
  tradingAccountId!: string;

  @IsEnum(CopyMemberRole)
  role!: CopyMemberRole;

  @IsOptional()
  @IsNumberString()
  quantityMultiplier?: string;

  @IsOptional()
  @IsNumberString()
  fixedQuantity?: string;

  @IsOptional()
  @IsNumberString()
  maxQuantity?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateCopyGroupMemberDto {
  @IsOptional()
  @IsNumberString()
  quantityMultiplier?: string;

  @IsOptional()
  @IsNumberString()
  fixedQuantity?: string | null;

  @IsOptional()
  @IsNumberString()
  maxQuantity?: string | null;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpsertCopyRuleDto {
  @IsOptional()
  @IsBoolean()
  copyEntries?: boolean;

  @IsOptional()
  @IsBoolean()
  copyExits?: boolean;

  @IsOptional()
  @IsBoolean()
  copyStopLoss?: boolean;

  @IsOptional()
  @IsBoolean()
  copyTakeProfit?: boolean;

  @IsOptional()
  @IsBoolean()
  copyLimitOrders?: boolean;

  @IsOptional()
  @IsBoolean()
  copyStopOrders?: boolean;

  @IsOptional()
  @IsNumberString()
  maxPositionQuantity?: string | null;

  @IsOptional()
  @IsNumberString()
  dailyLossLimit?: string | null;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
