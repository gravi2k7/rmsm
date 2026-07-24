import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, MinLength } from "class-validator";

export class ModerateRequestDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  input!: string;

  @ApiPropertyOptional({ description: "Explicit provider override. Note: Ollama does not support moderation — see the AiProvider capabilities endpoint." })
  @IsOptional()
  @IsIn(["openai"])
  provider?: string;
}

export class ModerateResponseDto {
  @ApiProperty() flagged!: boolean;
  @ApiProperty({ type: "object" }) categories!: Record<string, boolean>;
  @ApiProperty({ type: "object" }) categoryScores!: Record<string, number>;
}
