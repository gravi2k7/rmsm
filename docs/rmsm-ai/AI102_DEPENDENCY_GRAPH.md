# AI-102 — Dependency Graph

## Architecture

An immutable, topology-only structure — "the graph must be independent from execution" (item
1's own words). A `DependencyGraph` knows nothing about calculation modes, timeouts, or
execution plans; it is purely `nodes` (one per registered `IndicatorDefinition`) and `edges`
(one per `dependencies` entry). Everything execution-related — calculation mode, timeout policy,
cancellation policy — lives on `ExecutionPlan` instead (`AI102_EXECUTION_PLAN.md`), built FROM a
graph plus a request, never mixed into the graph itself.

```
DependencyGraph
├── graphId, graphVersion
├── nodes: DependencyNode[]         { identifier, version }
├── edges: DependencyEdge[]         { from, to, dependencyType, versionConstraint?,
│                                      executionPriority, calculationMode?, metadata }
└── metadata: { builtAt, sourceDefinitionCount }
```

`DependencyGraphBuilderService` builds one from the current registry state
(`IndicatorRegistryService.listAll()`, Phase 2A) — every definition becomes a node, every
`definition.dependencies` entry becomes an edge. `Object.freeze()`-d (deep) before being
returned — the same structural-immutability discipline `IndicatorDefinition` (Phase 2A) and
`ExecutionContext`/`ExecutionResult` (Phase 2B) already established.

## Dependency Resolution Flow

```
DependencyResolverService.produceDependencyTree(graph, "institutional_structure")
    │
    ├─ resolveDirect: [market_state_engine, liquidity_detection, order_blocks, bos]
    │     (one level — the 4 direct dependencies this real proprietary indicator names)
    │
    ├─ resolveTransitive: adds swing_detection (liquidity_detection's and bos's own
    │     further dependency) — every reachable identifier, at any depth
    │
    └─ produceDependencyTree: the same information, nested into a real tree structure
          institutional_structure
          ├── market_state_engine
          ├── liquidity_detection
          │   └── swing_detection
          ├── order_blocks
          └── bos
              └── swing_detection
```

`detectMissing` and `resolveVersion` are checked separately, not baked into tree construction —
a caller can ask "is anything missing" without paying for a full tree build, and vice versa.

## Cycle Detection

Depth-first search tracking two sets: nodes whose entire subtree has already been explored
(safe to skip on a later visit) and nodes on the CURRENT recursion path (revisiting one of
these means a real cycle). Critically, this correctly distinguishes a cycle from a legitimate
**diamond dependency** — `institutional_structure` depending on both `liquidity_detection` and
`bos`, which share `swing_detection` as a common further dependency, is not a cycle (verified by
a dedicated test using exactly this real shape) — only a genuine back-edge to something still
on the current path counts.

## Topological Sort

Kahn's algorithm (in-degree counting, not recursive DFS) over the reachable subgraph from one
root — item 4's own worked example, verified literally: `EMA → MACD → Strategy Indicator`
sorts as `["ema", "macd", "strategy_indicator"]`. Falls back to alphabetical ordering among
same-tier nodes with no ordering relationship to each other (a real, if minor, tiebreaker
choice — any other stable order would have worked equally well, and this one is simplest to
test deterministically).

## Real Verification Against Phase 2A's Actual 28 Definitions

Every algorithm above is tested twice: once against small, hand-built fixture graphs (isolating
one behavior at a time), and once again by building a REAL graph from the actual registrar
(`IndicatorDefinitionRegistrarService`, Phase 2A) and running the real algorithms against it —
the same "test the real pipeline against real data, not just isolated units" discipline that
caught a genuine registration-order bug during Phase 2A's own verification. This real graph
passes full `GraphValidatorService` validation, and its real `supertrend→atr`, `macd→ema`,
`keltner_channel→atr+ema`, and `institutional_structure`'s 4-way proprietary chain all sort
correctly.

## Graph Metrics

`GraphMetricsService.compute()` finds every "root" (a node nothing else depends on), sorts each
root's own subgraph, and reports the single longest chain across all of them as `graphDepth`/
`longestDependencyChain` — the genuine worst case for the whole graph, not just one indicator.
Against the real registered set, `institutional_structure`'s own chain is the deepest, verified
directly rather than assumed.

## Known Limitations

- `DependencyGraphBuilderService.build()` rebuilds from scratch every call — no incremental
  update (item 13's own named extension point, `IncrementalGraphUpdater`, real interface, no
  implementation). At 28 definitions this is fast enough not to matter; a real concern only at
  much larger registry scale.
- Graph-layer validation does not (and structurally cannot) check timeframe/indicator support —
  a `DependencyNode` carries only an identifier and version, no timeframe data. Those checks
  already happen correctly at the registry (Phase 2A) and execution (Phase 2B) layers instead
  — see `GraphValidatorService`'s own header comment for the full reasoning.
