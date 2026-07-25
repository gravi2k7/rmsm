/** The output of `TaskGraphService.buildLayers` — a topologically
 * ordered sequence of "layers," where every task id within a layer has
 * no dependency on any other task in that same layer and so can run in
 * parallel; each layer depends only on tasks from strictly earlier
 * layers. This is the concrete mechanism behind "parallel planning." */
export type TaskGraphLayers = readonly (readonly string[])[];
