import type { BrokerErrorClassification } from "../contracts/broker.contracts";

/** This domain's own error-mapper contract — structurally identical to market-data's `ProviderErrorMapper` (by convention, not by import) so the "classify raw errors into a small closed vocabulary, then ask isRetryable() of the classification" pattern stays consistent for any engineer who has worked in either domain, without creating a real code dependency between them. */
export interface BrokerErrorMapper {
  classify(error: unknown): BrokerErrorClassification;
  isRetryable(classification: BrokerErrorClassification): boolean;
}
