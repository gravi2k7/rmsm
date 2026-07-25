/** The "cancellation" capability's port — checked between steps/waves
 * so a long-running `WorkflowEngine.run()` call can be stopped early.
 * `SimpleCancellationToken` is the real, concrete implementation this
 * package ships. */
export interface CancellationToken {
  isCancelled(): boolean;
}
