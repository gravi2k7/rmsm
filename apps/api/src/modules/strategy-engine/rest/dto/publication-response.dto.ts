import { ApiProperty } from "@nestjs/swagger";

export class PublicationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() strategyVersionId!: string;
  @ApiProperty() publishedByUserId!: string;
  @ApiProperty() publishedAt!: Date;
  @ApiProperty({ nullable: true }) supersedesVersionId!: string | null;
}
