import { ApiProperty, ApiPropertyOptional, ApiExtraModels, getSchemaPath } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsIn, IsObject, IsOptional, IsString, ValidateNested } from "class-validator";

/**
 * The recursive rule-tree DTOs — `CreateVersionDto`'s own
 * `entryRules`/`exitRules` fields are trees of arbitrary depth (the
 * domain's own `RuleGroup` entity imposes no depth limit, Milestone 1's
 * own comment). `class-validator`'s `@ValidateNested()` + `@Type()`
 * handles a SELF-referencing DTO class correctly (`RuleGroupDto`
 * referencing `RuleGroupDto` itself inside `children`) as long as the
 * `@Type()` callback is a function (not a direct class reference,
 * which would fail at class-definition time before the class itself
 * finishes being declared) — the standard, well-documented pattern for
 * exactly this recursion.
 */

export class OperandDto {
  @ApiProperty({ enum: ["indicator", "market_field", "constant"] })
  @IsIn(["indicator", "market_field", "constant"])
  kind!: "indicator" | "market_field" | "constant";

  @ApiPropertyOptional({ description: "Required when kind = indicator" })
  @IsOptional()
  @IsString()
  indicatorIdentifier?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  indicatorVersion?: string;

  @ApiPropertyOptional({ type: "object" })
  @IsOptional()
  @IsObject()
  parameters?: Record<string, number | string | boolean>;

  @ApiPropertyOptional({ description: "Required when kind = indicator" })
  @IsOptional()
  @IsString()
  outputSeries?: string;

  @ApiPropertyOptional({ enum: ["open", "high", "low", "close", "volume"], description: "Required when kind = market_field" })
  @IsOptional()
  @IsIn(["open", "high", "low", "close", "volume"])
  field?: "open" | "high" | "low" | "close" | "volume";

  @ApiPropertyOptional({ description: "Required when kind = constant" })
  @IsOptional()
  @IsString()
  value?: string;
}

export class ConditionDto {
  @ApiProperty({ type: OperandDto })
  @ValidateNested()
  @Type(() => OperandDto)
  leftOperand!: OperandDto;

  @ApiProperty({ enum: ["GREATER_THAN", "GREATER_THAN_OR_EQUAL", "LESS_THAN", "LESS_THAN_OR_EQUAL", "EQUAL", "NOT_EQUAL", "CROSSES_ABOVE", "CROSSES_BELOW", "BETWEEN"] })
  @IsIn(["GREATER_THAN", "GREATER_THAN_OR_EQUAL", "LESS_THAN", "LESS_THAN_OR_EQUAL", "EQUAL", "NOT_EQUAL", "CROSSES_ABOVE", "CROSSES_BELOW", "BETWEEN"])
  operator!: string;

  @ApiProperty({ type: OperandDto })
  @ValidateNested()
  @Type(() => OperandDto)
  rightOperand!: OperandDto;

  @ApiPropertyOptional({ type: OperandDto, description: "Required when operator = BETWEEN" })
  @IsOptional()
  @ValidateNested()
  @Type(() => OperandDto)
  rightOperandUpper?: OperandDto;
}

export class RuleDto {
  @ApiProperty({ enum: ["rule"], description: "Discriminator — a REST-DTO-only concept. The domain's own RuleGroup.children array has no such field (it distinguishes Rule from RuleGroup via `instanceof` at runtime, since domain objects are real class instances, not deserialized JSON); this DTO needs an explicit marker specifically because class-transformer's own polymorphic-array deserialization requires one to tell a Rule from a nested RuleGroup in incoming JSON." })
  @IsIn(["rule"])
  kind!: "rule";

  @ApiProperty()
  @IsString()
  label!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({ type: ConditionDto })
  @ValidateNested()
  @Type(() => ConditionDto)
  condition!: ConditionDto;
}

@ApiExtraModels(() => RuleGroupDto)
export class RuleGroupDto {
  @ApiProperty({ enum: ["group"] })
  @IsIn(["group"])
  kind!: "group";

  @ApiProperty({ enum: ["AND", "OR", "NOT"] })
  @IsIn(["AND", "OR", "NOT"])
  operator!: "AND" | "OR" | "NOT";

  @ApiProperty({
    description: "Each entry is either a RuleDto (kind: \"rule\") or a nested RuleGroupDto (kind: \"group\").",
    type: "array",
    items: { oneOf: [{ $ref: getSchemaPath(RuleDto) }, { $ref: getSchemaPath(RuleGroupDto) }] },
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object, {
    discriminator: {
      property: "kind",
      subTypes: [
        { value: RuleDto, name: "rule" },
        { value: RuleGroupDto, name: "group" },
      ],
    },
    keepDiscriminatorProperty: true,
  })
  children!: (RuleDto | RuleGroupDto)[];
}
