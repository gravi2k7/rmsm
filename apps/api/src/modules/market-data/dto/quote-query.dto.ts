import { Transform } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";
import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from "class-validator";

export class QuoteQueryDto {
  @ApiProperty({ type: [String], description: "Instrument ids to fetch the latest quote for." })
  @Transform(({ value }) =>
    Array.isArray(value) ? value : [value],
  )
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsUUID(undefined, { each: true })
  instrumentIds!: string[];
}
