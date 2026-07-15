import { ApiProperty } from "@nestjs/swagger";

/** The one response-envelope shape every list endpoint in this module uses — matches Phase 4's "consistent response contracts" requirement literally: one shape, reused, not redeclared per controller. */
export class PaginationMetaDto {
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() totalCount!: number;
  @ApiProperty() totalPages!: number;
  @ApiProperty() hasNextPage!: boolean;
  @ApiProperty() hasPreviousPage!: boolean;
}
