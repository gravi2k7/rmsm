import { ApiProperty } from "@nestjs/swagger";
import { IsInt, Min, Max } from "class-validator";

export class UpdateProviderPriorityDto {
  @ApiProperty({ example: 10, minimum: 1, maximum: 1000 })
  @IsInt()
  @Min(1)
  @Max(1000)
  priority!: number;
}
