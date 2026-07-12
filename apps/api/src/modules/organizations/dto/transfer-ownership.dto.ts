import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

export class TransferOwnershipDto {
  @ApiProperty({ description: "The membershipId of the active member who will become the new Owner." })
  @IsUUID()
  toMembershipId!: string;
}
