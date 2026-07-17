import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsIn, IsOptional, IsString, ValidateNested } from "class-validator";
import { RuleGroupDto } from "./rule-tree.dto";

const PARAM_TYPE_VALUES = ["integer", "decimal", "boolean", "enum", "string"] as const;

export class StrategyParameterDefinitionDto {
  @ApiProperty({ enum: PARAM_TYPE_VALUES })
  @IsIn(PARAM_TYPE_VALUES)
  type!: (typeof PARAM_TYPE_VALUES)[number];

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsBoolean()
  required!: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  defaultValue?: number | string | boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  min?: number | string;

  @ApiProperty({ required: false })
  @IsOptional()
  max?: number | string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  allowedValues?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  maxLength?: number;
}

export class CreateVersionDto {
  @ApiProperty({ type: RuleGroupDto })
  @ValidateNested()
  @Type(() => RuleGroupDto)
  entryRules!: RuleGroupDto;

  @ApiProperty({ type: RuleGroupDto })
  @ValidateNested()
  @Type(() => RuleGroupDto)
  exitRules!: RuleGroupDto;

  @ApiProperty({ type: [StrategyParameterDefinitionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StrategyParameterDefinitionDto)
  parameters!: StrategyParameterDefinitionDto[];
}
