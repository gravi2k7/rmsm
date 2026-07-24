import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, MinLength } from "class-validator";

export class EmbedRequestDto {
  @ApiProperty({ example: "text-embedding-3-small" })
  @IsString()
  @MinLength(1)
  model!: string;

  @ApiProperty({ description: "A single string, or an array of strings to embed in one call.", oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }] })
  input!: string | string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsIn(["openai", "ollama"])
  provider?: string;
}

export class EmbedResponseDto {
  @ApiProperty({ type: "array", items: { type: "array", items: { type: "number" } } })
  embeddings!: number[][];

  @ApiProperty() model!: string;

  @ApiProperty({ type: "object" }) usage!: { promptTokens: number; totalTokens: number };
}
