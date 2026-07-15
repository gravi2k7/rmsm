import type { ExecuteIndicatorRequest, IndicatorExecutionResponse } from "./service-models.interface";

/**
 * Extension points (item 13) — the same real-interface,
 * no-implementation discipline as Phase 2B's and Phase 2C's own
 * extension-points files. All 6 named here describe TRANSPORT/CONSUMER
 * concerns specifically (how something outside this module reaches
 * `IndicatorEngineService`), distinct from Phase 2B/2C's extension
 * points (which described internal EXECUTION concerns — GPU
 * acceleration, cluster execution, caching). No overlap.
 */

/** A future REST controller's own shape — takes an HTTP-friendly request, returns an HTTP-friendly response, both already exactly ExecuteIndicatorRequest/IndicatorExecutionResponse (this phase's own service models are deliberately transport-agnostic and JSON-serializable, so a real REST controller implementing this would need essentially no translation layer). */
export interface RestApiExtensionPoint {
  handleExecuteRequest(body: unknown): Promise<IndicatorExecutionResponse>;
}

/** A future GraphQL resolver's own shape. */
export interface GraphQlExtensionPoint {
  resolveExecute(args: ExecuteIndicatorRequest): Promise<IndicatorExecutionResponse>;
}

/** A future WebSocket handler pushing execution results as they complete, rather than a single request/response round trip. */
export interface WebSocketExtensionPoint {
  subscribeToExecution(request: ExecuteIndicatorRequest, onResult: (response: IndicatorExecutionResponse) => void): void;
}

/** A future streaming interface (e.g. live-bar/live-tick indicator updates, CalculationMode's own LIVE_TICK/LIVE_BAR variants, Phase 2B) — repeated `IndicatorExecutionResponse` emissions over time rather than one-shot. */
export interface StreamingExtensionPoint {
  stream(request: ExecuteIndicatorRequest): AsyncIterable<IndicatorExecutionResponse>;
}

/** A future AI/ML module (e.g. AI-109 AI Analysis, named in this phase's own architecture diagram) consuming indicator results as model input — the same IndicatorEngineService entry point, just a different class of caller than a human-facing transport. */
export interface AiModuleExtensionPoint {
  requestForModel(request: ExecuteIndicatorRequest): Promise<IndicatorExecutionResponse>;
}

/** A future distributed deployment where IndicatorEngineService itself runs behind a load balancer across multiple instances — distinct from Phase 2B's ClusterExecutionCoordinator (which distributes a single EXECUTION's own work), this is about distributing REQUESTS across multiple whole service instances. */
export interface DistributedExecutionExtensionPoint {
  routeRequest(request: ExecuteIndicatorRequest): Promise<string>;
}
