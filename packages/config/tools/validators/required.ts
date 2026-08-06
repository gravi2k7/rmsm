import type {
  EnvVariableMetadata,
  ValidationResult,
} from "../types";
import type { Validator } from "./validator";

export class RequiredValidator implements Validator {
  validate(
    metadata: EnvVariableMetadata[],
    env: Record<string, string | undefined>,
  ): ValidationResult {

    const result: ValidationResult = {
      errors: [],
      warnings: [],
    };

    for (const variable of metadata) {
      if (!variable.required) {
        continue;
      }

      const value = env[variable.name];

      if (value === undefined || value.trim() === "") {
        result.errors.push({
          variable: variable.name,
          severity: "error",
          message: "Required environment variable is missing.",
        });
      }
    }

    return result;
  }
}   