import type { CancellationToken } from "../repositories/cancellation-token.interface";

export class SimpleCancellationToken implements CancellationToken {
  private cancelled = false;

  cancel(): void {
    this.cancelled = true;
  }

  isCancelled(): boolean {
    return this.cancelled;
  }
}
