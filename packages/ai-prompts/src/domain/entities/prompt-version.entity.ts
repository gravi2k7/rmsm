/**
 * One entry in a template name's version history, as tracked by
 * `PromptRegistry.versions()`. Distinct from `PromptTemplate.version`
 * (a single string field on the template itself, e.g. "1.2.0") — this
 * is the audit record of *when* and *by whom* that version was
 * registered, independent of the template content.
 */
export interface PromptVersion {
  readonly version: string;
  readonly createdAt: Date;
  readonly author: string;
}
