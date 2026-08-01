import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

export class AssignLicenseDto {
  @ApiProperty()
  @IsUUID()
  organizationId!: string;
}
