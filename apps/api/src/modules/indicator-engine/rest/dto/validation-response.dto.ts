import { ApiProperty } from "@nestjs/swagger";

export class ValidationDto {
  @ApiProperty() valid!: boolean;
  @ApiProperty({ type: [String] }) errors!: string[];
}
