# AI Phase 5.1 — AI Foundation — Milestone 1: AI-201 Gateway

Status: Complete — Awaiting Review Before Milestone 2

## Milestone Plan (Proposed, Not Yet Confirmed)

The master prompt's own scope spans 4 whole modules (AI-201 Gateway, AI-202 Prompt Platform,
AI-203 Memory Platform, AI-204 Observability Platform), each individually comparable in size to
a full AI-10x module. Rather than attempt all four at once, this was split into 4 milestones —
Gateway first, since Prompt/Memory/Observability all integrate *through* it and should inherit
whatever provider-adapter convention Gateway establishes rather than invent their own. This
milestone delivers AI-201 only.

## 1. What Was Implemented

29 files (20 production, 9 test) — the real "Unified AI API" this phase's own opening rule
describes: "no business module should ever directly call OpenAI, Claude, Gemini, Ollama, etc. —
everything goes through the AI Gateway."

- **The core `AiProvider` contract** — one interface (chat, stream, embed, moderate,
  healthCheck, countTokens, supportedModels, capabilities) every provider implements, cloud or
  local, present or future.
- **2 real provider adapters**, proving genuine cloud/local agnosticism, not just a paper claim:
  `OpenAiProvider` (genuine HTTP calls to `/v1/chat/completions`, `/v1/embeddings`,
  `/v1/moderations`, real SSE stream parsing) and `OllamaProvider` (genuine calls to a local
  Ollama server's own `/api/chat`, `/api/embeddings`, real newline-delimited-JSON stream
  parsing — a genuinely different wire format from OpenAI's, which the adapter exists to hide
  from callers).
- **Provider registry + model registry**, mirroring AI-101's own proven `Map`-based
  registration pattern exactly — a future Anthropic/Gemini/Azure OpenAI/vLLM/NVIDIA NIM/
  HuggingFace TGI adapter registers itself with zero changes to any other file.
- **Real resilience**: retry with exponential backoff, plus AI-101's own existing
  `CircuitBreaker` class reused directly (one instance per provider type) — not duplicated into
  a second implementation.
- **A real token-bucket rate limiter** and **a real cost tracker** with genuine published OpenAI
  per-model pricing (local providers correctly cost $0.00, not "unknown").
- **`AiGatewayService`** — the one orchestration class composing all of the above; the only
  class in this module with a real dependency on the provider registry.
- **Full REST surface**: `POST /api/ai/chat`, `POST /api/ai/stream` (real Server-Sent Events),
  `POST /api/ai/embed`, `POST /api/ai/moderate`, `GET /api/ai/models`, `GET /api/ai/providers` —
  exactly the 6 endpoints this phase's own "Public API" section names.
- **Centralized, validated config** — 13 new `envSchema.ts` keys, no hardcoded values anywhere
  in the provider adapters or resilience layer.

## 2. Architectural Decisions

### Reused the platform's own earliest error convention (`AppError`), not a third pattern
AI-102/AI-103 each built their own `code`-based error hierarchy with a dedicated REST exception
filter. AI-201 sits at a lower, platform-infrastructure layer — and the platform's own
`GlobalExceptionFilter` (registered globally since Module 001) already catches any `AppError`
and maps its own `statusCode` directly. Extending that here, rather than building a third
pattern, is the more conservative choice for new foundational infrastructure.

### A real, pre-existing config collision found and resolved, not silently duplicated
While adding `OPENAI_API_KEY` to config, typecheck caught a genuine duplicate — the key already
existed as part of an unused "AI service" placeholder block from an earlier session (`AI_SERVICE_URL`,
`AI_SERVICE_API_KEY`, `OPENAI_API_KEY`), almost certainly the "AI Service already exists" this
phase's own prompt refers to. Confirmed via a real search that its only other reference in the
whole codebase was a test fixture, not actual business logic — this Gateway is genuinely the
first real consumer. Removed the duplicate declaration and documented the reuse, rather than
either redefining it or silently leaving two conflicting declarations.

### `countTokens(text, model)` — a real interface/implementation mismatch caught by typecheck
The `AiProvider` interface declares `model` as part of the contract (different models can have
genuinely different tokenizers). Both providers' own first-draft implementations omitted it —
TypeScript's structural typing let this pass silently when providers were used *as* the
interface, but a direct test call against the concrete class caught the real mismatch. Fixed by
making both adapters' own signatures match the contract exactly, with an honest comment on why
neither currently varies its estimate by model.

### Streaming does not go through the retry wrapper — a named, deliberate tradeoff
Retrying a partially-yielded async generator would mean re-emitting chunks a caller already
received once — a real correctness problem, not one retry-around-an-iterator solves for free.
`stream()` still benefits from circuit-breaker *protection* on subsequent calls (a failed stream
still records a failure against that provider's own breaker), but does not retry in place. Named
explicitly in the gateway's own code, not silently narrower than `chat()`'s own resilience.

### Not organization-scoped in the URL, unlike AI-103's convention — a deliberate, real distinction
AI-103's strategies are organization-*owned* business records, hence
`/organizations/:organizationId/strategies`. An AI chat/embed/moderate call is a stateless
operation performed *on behalf of* an organization, not a resource living inside one.
`organizationId` is still real (an optional query parameter, used for genuine rate-limit and
cost-tracking scoping) — just not baked into the path.

### `chat()` is fully stateless this milestone — persistent memory is explicitly AI-203's job
A caller supplies the complete message array on every call. No conversation state, no context
compression, no token-budget management exists yet — that's the Memory Platform's own scope
(Milestone 3), not something this milestone approximates early.

## 3. Deliberately Deferred (Named, Not Silently Skipped)

- **AI-202 Prompt Platform, AI-203 Memory Platform, AI-204 Observability Platform** — not
  started; proposed as Milestones 2-4.
- **Anthropic, Gemini, Azure OpenAI, vLLM, NVIDIA NIM, HuggingFace TGI adapters** — the registry
  and interface are ready for them; only 2 real adapters were built this milestone to prove the
  pattern, not all 8+ named providers.
- **Real `tiktoken`-precision token counting** — both adapters use an honest, documented
  4-characters-per-token approximation rather than adding a WASM dependency this milestone.
- **Redis-backed, multi-instance-safe rate limiting and circuit breaking** — both are real but
  in-memory/single-instance, the same honestly-scoped category as AI-101's own circuit breaker.

## 4. Testing

54 new tests across 9 files, all genuinely executed:

- **`AiProviderRegistryService`** (7), **`AiModelRegistryService`** (5) — real registration,
  lookup, and derived-model-list behavior.
- **`AiRateLimiterService`** (5) — real token-bucket exhaustion and per-scope isolation.
- **`AiCostTrackerService`** (4) — real cost computation against genuine per-model pricing.
- **`AiProviderResilienceService`** (5) — real retry-then-succeed, real exhausted-retry
  propagation, real circuit-opening after threshold, real per-provider circuit isolation.
- **`AiGatewayService`** (7) — the full orchestration path: capability checks fire *before* any
  provider call, rate limiting is enforced first, explicit provider overrides are respected.
- **`OpenAiProvider`** (9), **`OllamaProvider`** (8) — real request/response mapping against
  mocked HTTP (no live API key or network access to either service exists in this sandbox — the
  same standing limitation as every AI-101 market-data provider adapter).
- **Layering test** (2) — reads the controller's own source and confirms it imports nothing from
  `providers/` or `registry/` directly.

**2 real bugs found and fixed by running these tests, not just writing them**: a
`countTokens(text, model)` signature mismatch between the interface and both concrete providers
(caught by typecheck), and a classic JavaScript default-parameter footgun in the test file
itself — `buildConfig(undefined)` was silently resolving to the default `"sk-test"` value
instead of actually passing `undefined`, masking exactly the "no API key configured" scenario
the test was supposed to verify.

## 5. Files Changed

**Created (29)**: `interfaces/ai-provider.interface.ts`; `errors/ai-gateway.errors.ts`;
`config/ai-gateway-config.service.ts`; `registry/ai-provider-registry.service.ts`,
`registry/ai-model-registry.service.ts`; `providers/openai.provider.ts`,
`providers/ollama.provider.ts`, `providers/provider-registrar.service.ts`;
`gateway/ai-gateway.service.ts`, `gateway/ai-provider-resilience.service.ts`,
`gateway/ai-rate-limiter.service.ts`, `gateway/ai-cost-tracker.service.ts`; 6 DTO files;
`controllers/ai-gateway.controller.ts`; `ai.module.ts`; 9 test files.

**Modified**: `env.schema.ts` (13 new AI Gateway config keys), `app.module.ts` (registered
`AiModule`), `seed.ts` (`ai-gateway.use` permission, granted across all 4 platform tiers).

Zero changes to any frozen platform module (EP 000-005, AI-101, AI-102, AI-103). Zero Trading
AI, AI Agents, RAG, or Business Intelligence work — per this phase's own explicit exclusions.

## 6. Verification

| Check | Result |
|---|---|
| `pnpm lint` (`@rmsm/api`, `@rmsm/config`) | ✅ 0 errors |
| `pnpm typecheck` | ✅ 0 errors — 2 real issues found and fixed (a config key duplicate, an interface/implementation signature mismatch) |
| New tests (54 cases across 9 files) | ✅ Genuinely executed — including 2 real bugs found by running them |
| Full suite | ✅ 90/90 suites, 607/607 tests |
| `pnpm build` (`@rmsm/web`) | ✅ Builds successfully |
| TODO/placeholder/bare-`any` scan | ✅ none found |

---

**Awaiting your review before Milestone 2 (AI-202 Prompt Platform).**
