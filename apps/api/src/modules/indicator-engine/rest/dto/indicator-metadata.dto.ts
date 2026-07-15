import { ApiProperty } from "@nestjs/swagger";
import type { IndicatorDefinition } from "../../contracts/indicator-definition.interface";

/** Response mapping (item 4): "never expose internal engine models... convert Internal Models -> API DTOs." This IS that converted shape — a real DTO class with @ApiProperty annotations, structurally compatible with IndicatorDefinition (Phase 2A) but declared independently, so a future internal restructuring of IndicatorDefinition doesn't silently change this API's own public contract. */
export class IndicatorMetadataDto {
  @ApiProperty() identifier!: string;
  @ApiProperty() displayName!: string;
  @ApiProperty() version!: string;
  @ApiProperty() description!: string;
  @ApiProperty() category!: string;
  @ApiProperty({ type: "array", items: { type: "object" } }) inputs!: unknown[];
  @ApiProperty({ type: "array", items: { type: "object" } }) outputs!: unknown[];
  @ApiProperty({ type: "object" }) defaultParameters!: Record<string, unknown>;
  @ApiProperty({ type: [String] }) supportedTimeframes!: string[];
  @ApiProperty() minimumLookback!: number;
  @ApiProperty({ type: [String] }) dependencies!: string[];
  @ApiProperty({ type: [String] }) tags!: string[];
  @ApiProperty() author!: string;
  @ApiProperty({ enum: ["experimental", "stable", "deprecated"] }) stabilityLevel!: string;

  static fromDefinition(definition: IndicatorDefinition): IndicatorMetadataDto {
    const dto = new IndicatorMetadataDto();
    dto.identifier = definition.identifier;
    dto.displayName = definition.displayName;
    dto.version = definition.version;
    dto.description = definition.description;
    dto.category = definition.category;
    dto.inputs = definition.inputs;
    dto.outputs = definition.outputs;
    dto.defaultParameters = definition.defaultParameters;
    dto.supportedTimeframes = definition.supportedTimeframes;
    dto.minimumLookback = definition.minimumLookback;
    dto.dependencies = definition.dependencies;
    dto.tags = definition.tags;
    dto.author = definition.author;
    dto.stabilityLevel = definition.stabilityLevel;
    return dto;
  }
}
