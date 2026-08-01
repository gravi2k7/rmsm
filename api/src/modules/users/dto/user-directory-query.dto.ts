import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import { Type } from "class-transformer";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@rmsm/database";

const USER_STATUS_VALUES = ["PENDING_VERIFICATION", "ACTIVE", "LOCKED", "SUSPENDED", "ARCHIVED", "DELETED"] as const;
const SORT_FIELDS = ["createdAt", "email"] as const;

export class UserDirectoryQueryDto {
  @ApiPropertyOptional({ description: "Case-insensitive substring match on email or first/last name." })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ enum: USER_STATUS_VALUES })
  @IsOptional()
  @IsEnum(USER_STATUS_VALUES)
  status?: (typeof USER_STATUS_VALUES)[number];

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: MAX_PAGE_SIZE, default: DEFAULT_PAGE_SIZE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  pageSize?: number;

  /** Sorting is currently limited to createdAt/email (both indexed or the
   * primary listing order already used elsewhere) — a full arbitrary-column
   * sort is a real, named gap rather than something silently approximated. */
  @ApiPropertyOptional({ enum: SORT_FIELDS, default: "createdAt" })
  @IsOptional()
  @IsIn(SORT_FIELDS)
  sortBy?: (typeof SORT_FIELDS)[number];
}
