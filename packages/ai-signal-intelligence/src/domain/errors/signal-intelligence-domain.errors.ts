import { DomainError } from "@rmsm/core";

export class EmptySignalSetError extends DomainError {
  constructor() {
    super("At least one opportunity/signal must be provided for this operation.", "EMPTY_SIGNAL_SET");
  }
}
