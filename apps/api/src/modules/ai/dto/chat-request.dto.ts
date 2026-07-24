import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsIn, IsNumber, IsOptional, IsString, Max, Min, MinLength, ValidateNested } from "class-validator";
import { ChatMessageDto } from "./chat-message.dto";

export class ChatRequestDto {
  @ApiProperty({ example: "gpt-4o-mini" })
  @IsString()
  @MinLength(1)
  model!: string;

  @ApiProperty({ type: [ChatMessageDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages!: ChatMessageDto[];

  @ApiPropertyOptional({ minimum: 0, maximum: 2 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxTokens?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  topP?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  stopSequences?: string[];

  @ApiPropertyOptional({ description: "Explicit provider override. Omit to resolve automatically from the requested model." })
  @IsOptional()
  @IsIn(["openai", "ollama"])
  provider?: string;
}
