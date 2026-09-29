import type {
  Mt5Worker,
  Mt5WorkerAccount,
  Mt5WorkerConnectionResult,
  Mt5WorkerCredentials,
  Mt5WorkerOrderRequest,
  Mt5WorkerOrderResult,
  Mt5WorkerPosition,
} from "./mt5-worker.types";

/**
 * RMSM-managed MT5 execution transport.
 *
 * The transport is intentionally independent of the BrokerAdapter.
 * The actual Windows MT5 runtime will implement this contract.
 */
export interface Mt5WorkerTransport extends Mt5Worker {}

export type {
  Mt5WorkerAccount,
  Mt5WorkerConnectionResult,
  Mt5WorkerCredentials,
  Mt5WorkerOrderRequest,
  Mt5WorkerOrderResult,
  Mt5WorkerPosition,
};
