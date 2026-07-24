import { ApiProperty } from "@nestjs/swagger";

export class TokenUsageDto {
  @ApiProperty() promptTokens!: number;
  @ApiProperty() completionTokens!: number;
  @ApiProperty() totalTokens!: number;
}

export class ChatResponseDto {
  @ApiProperty() content!: string;
  @ApiProperty() model!: string;
  @ApiProperty({ enum: ["stop", "length", "content_filter", "tool_calls", "error"] }) finishReason!: string;
  @ApiProperty({ type: TokenUsageDto }) usage!: TokenUsageDto;
}
