import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional } from "class-validator";
import { PaginationDto } from "../../organizations/dto/pagination.dto";

const INVOICE_STATUS_VALUES = ["DRAFT", "OPEN", "PAID", "VOID", "FAILED"] as const;

/** Extends the existing PaginationDto (organizations module) rather than duplicating pagination logic — same reuse pattern already established there. */
export class InvoiceSearchDto extends PaginationDto {
  @ApiPropertyOptional({ enum: INVOICE_STATUS_VALUES })
  @IsOptional()
  @IsEnum(INVOICE_STATUS_VALUES)
  status?: (typeof INVOICE_STATUS_VALUES)[number];
}
