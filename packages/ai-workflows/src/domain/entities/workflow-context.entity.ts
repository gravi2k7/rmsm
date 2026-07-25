/** The read-only snapshot handlers and conditions see: the workflow's
 * original input plus every completed step's output so far, keyed by
 * `stepId`. Never mutated in place — `WorkflowEngine` builds a new one
 * as each step completes. */
export interface WorkflowContext {
  readonly input: unknown;
  readonly results: Readonly<Record<string, unknown>>;
}
