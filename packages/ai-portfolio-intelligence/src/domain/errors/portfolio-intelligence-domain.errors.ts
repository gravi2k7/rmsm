import { DomainError } from "@rmsm/core";

export class EmptyExposureSetError extends DomainError {
  constructor() {
    super("At least one symbol exposure must be provided for this analysis.", "EMPTY_EXPOSURE_SET");
  }
}
