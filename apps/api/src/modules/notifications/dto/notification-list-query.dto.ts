import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional } from "class-validator";
import { PaginationDto } from "../../organizations/dto/pagination.dto";

const STATUS_VALUES = ["PENDING", "QUEUED", "SENDING", "SENT", "DELIVERED", "FAILED", "BOUNCED", "READ", "ARCHIVED", "CANCELLED"] as const;

/** Reuses the existing PaginationDto (organizations module) — same reuse pattern as Module 004's InvoiceSearchDto. */
export class NotificationListQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: STATUS_VALUES })
  @IsOptional()
  @IsEnum(STATUS_VALUES)
  status?: (typeof STATUS_VALUES)[number];
}
