import type {
  EnvVariableMetadata,
  ValidationResult,
} from "../types";

export interface Validator {
  validate(
    metadata: EnvVariableMetadata[],
    env: Record<string, string | undefined>,
  ): ValidationResult;
}