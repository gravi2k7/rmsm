import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

/** Filtered by instrumentId only — the repository (CorporateActionRepository, Phase 2A) has no broader filter method, and Phase 4 explicitly forbids repository changes. Reflects the actual backing capability rather than accepting query params this endpoint couldn't honor. */
export class CorporateActionQueryDto {
  @ApiProperty()
  @IsUUID()
  instrumentId!: string;
}
