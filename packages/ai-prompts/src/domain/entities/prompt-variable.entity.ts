/**
 * A single `{{name}}` placeholder a `PromptTemplate` declares it uses.
 * Declaring variables up front (rather than inferring them purely from
 * regex-scanning `template` text at render time) is what lets
 * `PromptValidator` catch two classes of authoring mistakes render-time
 * substitution alone can't: a variable used in the template body but
 * never declared ("unknown variable"), and one declared but never
 * referenced (dead metadata — a hygiene warning, not an error).
 */
export interface PromptVariable {
  readonly name: string;
  readonly required: boolean;
  readonly defaultValue?: string;
  readonly description?: string;
}
