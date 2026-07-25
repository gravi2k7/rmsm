export class ConfigValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super("Invalid environment configuration");
    this.name = "ConfigValidationError";
  }
}