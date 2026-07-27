import { ApiProperty } from "@nestjs/swagger";

/**
 * WM-020B — formalizes the register endpoint's pre-existing return shape
 * (`{ message: string }`) as an actual class, per the milestone's "Response
 * DTO" deliverable. Deliberately just `message` — no `userId`/`email`/
 * `status` field, per "Never expose internal database fields" (Controller
 * spec) and because email verification (the only thing that would ever
 * consume a returned id here) is a later milestone's concern.
 */
export class RegisterResponseDto {
  @ApiProperty({ example: "If that email is available, an account has been created." })
  message!: string;
}
