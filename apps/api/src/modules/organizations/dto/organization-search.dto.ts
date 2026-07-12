import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { PaginationDto } from "./pagination.dto";

const ORGANIZATION_STATUS_VALUES = ["ACTIVE", "ARCHIVED", "DELETED"] as const;

export class OrganizationSearchDto extends PaginationDto {
  @ApiPropertyOptional({ description: "Case-insensitive substring match on organization name." })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ enum: ORGANIZATION_STATUS_VALUES })
  @IsOptional()
  @IsEnum(ORGANIZATION_STATUS_VALUES)
  status?: (typeof ORGANIZATION_STATUS_VALUES)[number];
}
