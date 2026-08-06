export interface EnvVariableMetadata {
  /**
   * Environment variable name
   */
  name: string;

  /**
   * Primitive type after unwrapping Zod
   * string | number | boolean | enum | array | object
   */
  type: string;

  /**
   * Required by runtime validation
   */
  required: boolean;

  /**
   * Default value if supplied by Zod
   */
  defaultValue?: unknown;

  /**
   * Schema that contributed this variable
   * Example:
   * app.schema.ts
   */
  sourceSchema?: string;

  /**
   * Logical domain
   * App
   * Database
   * Auth
   * AI
   * Email
   * Logging
   * etc.
   */
  category?: string;

  /**
   * Future documentation
   */
  description?: string;
}