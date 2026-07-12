import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

/**
 * Not one of the 8 explicitly-named DTOs — a small supporting DTO for the
 * token-based accept/decline endpoints, added because "no any, no unknown"
 * rules out leaving those request bodies untyped.
 */
export class InvitationTokenDto {
  @ApiProperty()
  @IsString()
  token!: string;
}
