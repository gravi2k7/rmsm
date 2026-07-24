import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString } from "class-validator";

export class ChatMessageDto {
  @ApiProperty({ enum: ["system", "user", "assistant", "tool"] })
  @IsIn(["system", "user", "assistant", "tool"])
  role!: "system" | "user" | "assistant" | "tool";

  @ApiProperty()
  @IsString()
  content!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  toolCallId?: string;
}
