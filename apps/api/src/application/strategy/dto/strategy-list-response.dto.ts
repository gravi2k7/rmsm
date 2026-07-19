import { ApiProperty } from "@nestjs/swagger";
import { StrategyResponseDto } from "./strategy-response.dto";

/** Matches `@rmsm/types`'s own `Paginated<T>` shape (`items`, `total`,
 * `page`, `pageSize`) — a concrete class (not the bare interface) purely
 * so Swagger has a real type to generate a schema from. */
export class StrategyListResponseDto {
  @ApiProperty({ type: [StrategyResponseDto] })
  items!: StrategyResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;
}
