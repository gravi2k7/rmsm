# Module 000 — Enterprise Foundation
**RMSM AI — Institutional-Grade AI Trading Platform**
Status: Draft for Approval · Owner: Platform Architecture · Version: 0.1.0

---

## 1. Purpose

This document is the foundation layer for RMSM AI. It defines the monorepo architecture,
engineering standards, workflows, and infrastructure conventions that every subsequent module
(001+) must comply with. No business logic or application code is included in this module —
by design, per the kickoff mandate.

RMSM AI targets retail traders, proprietary trading firms, hedge funds, family offices,
investment advisors, and asset managers. That audience means the foundation must assume from
day one: multi-tenancy, auditability, regulatory-grade data handling, and horizontal scale —
even though early modules will be simple.

---

## 2. Monorepo Structure

```
rmsm/
├── apps/
│   ├── web/            # Next.js customer-facing app (trading UI, dashboards, portfolio)
│   ├── api/             # NestJS core API — auth, billing, portfolios, signals, orchestration
│   ├── ai/               # Python/FastAPI AI service — LLM assistant, analysis engine, scanners
│   └── admin/          # Next.js internal admin portal — ops, support, compliance tooling
├── packages/
│   ├── ui/                 # Shared shadcn/ui-based component library (web + admin)
│   ├── shared/         # Cross-app TS utilities, constants, error types, DTO base classes
│   ├── database/    # Prisma schema, migrations, seed scripts (single source of schema truth)
│   ├── config/         # Typed environment/config loader shared by all Node apps
│   └── types/           # Shared TypeScript types/interfaces (API contracts, domain models)
├── infra/
│   ├── docker/          # Dockerfiles + docker-compose for local/dev/staging
│   ├── kubernetes/  # Helm charts / manifests (future production rollout)
│   └── terraform/    # IaC for cloud resources (future — Terraform-ready, not yet active)
├── docs/                    # Architecture decisions, module specs, standards
├── scripts/               # Repo automation: bootstrap, codegen, db reset, CI helpers
├── .github/workflows/  # CI/CD pipelines (GitHub Actions)
├── package.json          # Root workspace manifest
├── pnpm-workspace.yaml  # Workspace package graph
├── turbo.json                # Build/task orchestration (Turborepo)
├── .env.example
└── README.md
```

### Folder Responsibilities

| Path | Responsibility | Owner Layer |
|---|---|---|
| `apps/web` | Customer Portal + Trading UI. Consumes `api` and `ai` via REST/WS. No direct DB access. | Presentation |
| `apps/admin` | Internal Admin Portal — user mgmt, subscription ops, compliance review, feature flags. | Presentation |
| `apps/api` | Core business API: auth, RBAC, subscriptions, portfolios, signals, notifications, orchestration of `ai` service. | Application/Domain |
| `apps/ai` | AI Trading Assistant, Market Scanner, AI Analysis Engine, Strategy Builder inference. Stateless where possible; talks to `api` for persistence. | Domain (AI) |
| `packages/database` | Prisma schema is the single source of truth for PostgreSQL. All apps read generated types from here — never redefine models. | Infrastructure |
| `packages/shared` | Framework-agnostic logic reusable across Node apps (validation helpers, error classes, formatting). | Cross-cutting |
| `packages/types` | Hand-authored or generated API contract types shared between `web`, `admin`, `api`. Prevents drift. | Cross-cutting |
| `packages/config` | Centralized, typed, validated (Zod) env config. No app reads `process.env` directly. | Infrastructure |
| `packages/ui` | Design-system components. `web` and `admin` never duplicate UI primitives. | Presentation |
| `infra/*` | Everything needed to run/deploy the system. No app code lives here. | Infrastructure |

---

## 3. Naming Conventions

**General**
- Files: `kebab-case` (`trading-signal.service.ts`)
- Classes/Interfaces/Types: `PascalCase` (`TradingSignal`, `IUserRepository`)
- Variables/functions: `camelCase`
- Constants/enums values: `SCREAMING_SNAKE_CASE`
- DB tables: `snake_case`, plural (`trading_signals`)
- DB columns: `snake_case`
- Environment variables: `SCREAMING_SNAKE_CASE`, module-prefixed (`AI_SERVICE_API_KEY`)

**NestJS (apps/api)**
- `*.module.ts`, `*.controller.ts`, `*.service.ts`, `*.repository.ts`, `*.dto.ts`, `*.entity.ts`, `*.guard.ts`, `*.interceptor.ts`

**Next.js (apps/web, apps/admin)**
- Route segments: `kebab-case` folders (App Router)
- Components: `PascalCase.tsx`
- Hooks: `useCamelCase.ts`
- Zustand stores: `useXStore.ts`

**Python (apps/ai)**
- `snake_case` modules and functions, `PascalCase` classes, PEP 8 throughout, Ruff-enforced.

**Git branches / commits** — see Section 5.

---

## 4. Coding Standards

- **TypeScript strict mode** (`strict: true`) across every package/app. No implicit `any`; explicit `any` is a lint error, not a warning.
- **No duplicated logic** — shared logic belongs in `packages/shared` or `packages/types`.
- **No magic numbers/strings** — extracted to named constants or config.
- **No hardcoded secrets** — all secrets sourced via `packages/config`, backed by environment variables and (later) a secrets manager. `.env` files are never committed; `.env.example` documents required keys.
- **Every exported function/class documented** with TSDoc (TS) or docstrings (Python).
- **Every API endpoint documented** via Swagger/OpenAPI decorators in NestJS and FastAPI's native OpenAPI generation.
- **Repository Pattern** — controllers/services never call Prisma directly; they depend on repository interfaces (Dependency Inversion).
- **Feature-based modules** — NestJS modules organized by business capability (`signals/`, `portfolios/`, `billing/`), not by technical layer.
- **SOLID + Clean Architecture** — domain logic has zero framework dependency; framework code (controllers, ORM) sits at the edges.
- **Linting/formatting**: ESLint + Prettier (TS), Ruff + Black (Python), enforced via pre-commit hooks and CI — build fails on violation.
- **API Versioning**: all REST endpoints under `/api/v1/...` from day one.

---

## 5. Git Strategy & Branch Strategy

**Model:** Trunk-based development with short-lived feature branches.

- `main` — always deployable; protected; requires PR + passing CI + 1 approval (2 for `apps/api` domain logic once team scales).
- `develop` — integration branch for the current module cycle (optional once team > 1; solo/early phase can work directly against short-lived branches into `main`).
- `feature/<module-number>-<short-description>` — e.g. `feature/001-auth-service`
- `fix/<ticket-id>-<short-description>`
- `chore/<short-description>` — tooling, config, docs
- `release/<version>` — cut when preparing a tagged release

**Commit convention:** Conventional Commits — `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`, `ci:`. Enables automated changelogs and semantic versioning.

**PR requirements:** linked module/issue, passing CI (lint, typecheck, unit tests, build), no direct pushes to `main`.

**Tagging:** `vMAJOR.MINOR.PATCH` per SemVer, tagged on `main` at each release.

---

## 6. Environment Strategy

Four environments, strictly separated, each with its own config set and infra:

| Environment | Purpose | Data | Deploy Trigger |
|---|---|---|---|
| `local` | Developer machines via Docker Compose | Synthetic/seeded | Manual |
| `development` | Shared integration environment | Synthetic | Auto on merge to `develop`/`main` |
| `staging` | Pre-production, prod-parity | Anonymized/synthetic | Auto on release branch |
| `production` | Live | Real | Manual approval gate after staging soak |

- Config loaded via `packages/config`, validated with Zod at boot — app fails fast on missing/invalid env vars rather than failing silently at runtime.
- No environment shares secrets or database instances with another.
- Twelve-Factor compliance: config in environment, no environment-specific code branches, dependencies explicitly declared, stateless processes, logs treated as event streams.

---

## 7. Docker Architecture

**Local development** (`infra/docker/docker-compose.yml`):
- `postgres` — primary datastore
- `redis` — caching, BullMQ queues, session/rate-limit store
- `api` — NestJS, hot-reload volume mount
- `ai` — FastAPI, hot-reload volume mount
- `web` — Next.js dev server
- `admin` — Next.js dev server
- `nginx` — local reverse proxy mirroring production routing (optional, enabled for parity testing)

**Image strategy:**
- Multi-stage Dockerfiles per app (`deps → build → runtime`) to keep production images minimal.
- Node apps: `node:LTS-alpine` runtime stage.
- Python AI service: `python:slim` runtime stage with locked dependencies (Poetry/uv).
- No dev dependencies in production images.
- Each app publishes its own versioned image via CI; images are immutable and promoted across environments (build once, deploy everywhere).

**Kubernetes-ready:** Compose services map 1:1 to future K8s Deployments; `infra/kubernetes/` will hold Helm charts once Module 000's Compose baseline is validated. Not activated yet — placeholder only, per scope.

---

## 8. Development Workflow (applies to every future module)

Per the kickoff mandate, every module — including this one — proceeds through six phases, and **no phase is skipped**:

1. **Requirements / Architecture / Design** — module spec drafted and approved before any structure or code.
2. **Folder Structure / Database Schema / API Design** — concrete scaffolding and contracts.
3. **Implementation**
4. **Testing** — unit, integration, and (where relevant) e2e.
5. **Documentation** — spec finalized to match what was actually built.
6. **Review** — explicit stop-and-approve checkpoint before the next module begins.

Module 000 delivers Phases 1–2 equivalents at the repository level (structure, standards, workflow) and stops here for approval, per the kickoff instructions.

---

## 9. Project Dependency Diagram

```
                        ┌─────────────────┐
                        │   packages/*    │
                        │ (ui, shared,    │
                        │ database, types,│
                        │    config)      │
                        └────────┬────────┘
                 ┌───────────────┼───────────────┬───────────────┐
                 ▼               ▼               ▼               ▼
           ┌──────────┐   ┌──────────┐    ┌──────────┐   ┌──────────┐
           │ apps/web │   │apps/admin│    │ apps/api │   │ apps/ai  │
           │ (Next.js)│   │ (Next.js)│    │ (NestJS) │   │(FastAPI) │
           └────┬─────┘   └────┬─────┘    └────┬─────┘   └────┬─────┘
                │              │                │              │
                └──────────────┴───────REST/WS──┘◄────REST─────┘
                                                 │
                                        ┌────────┴────────┐
                                        │  PostgreSQL /    │
                                        │     Redis        │
                                        └───────────────────┘
```

Rules encoded by this diagram:
- `web` and `admin` never talk to `ai` or the database directly — always through `api`.
- `ai` may call back into `api` for persistence, never touches Postgres directly (keeps one write path, one source of truth).
- `packages/*` has zero dependency on `apps/*` (strict one-way dependency graph, enforced by Turborepo pipeline + ESLint import boundaries).

---

## 10. Initial Package List

**Root / tooling**
`turbo`, `pnpm`, `eslint`, `prettier`, `husky`, `lint-staged`, `commitlint`, `typescript`

**apps/web & apps/admin**
`next`, `react`, `react-dom`, `typescript`, `tailwindcss`, `shadcn/ui` (CLI-managed components), `framer-motion`, `@tanstack/react-query`, `zustand`, `react-hook-form`, `zod`

**apps/api**
`@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`, `@nestjs/swagger`, `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`, `@prisma/client`, `prisma`, `bullmq`, `ioredis`, `class-validator`, `class-transformer`, `zod`

**apps/ai**
`fastapi`, `uvicorn`, `langchain`, `openai`, `pandas`, `numpy`, `scikit-learn`, `pydantic`

**packages/database**
`prisma`

**Shared dev/test**
`jest`, `@testing-library/react`, `supertest`, `pytest`, `ts-jest`

---

## 11. Workspace Configuration

- **Package manager:** pnpm workspaces (fast installs, strict node_modules, ideal for monorepos).
- **Task orchestration:** Turborepo — caches build/test/lint tasks, respects the dependency graph in Section 9.
- **`pnpm-workspace.yaml`** includes `apps/*` and `packages/*`.
- **TypeScript project references** — root `tsconfig.base.json` extended by each app/package; incremental builds.
- **Shared ESLint/Prettier config** published from `packages/config` (or a dedicated `packages/eslint-config` if it grows) so every app lints identically.
- **CI (GitHub Actions):** matrix pipeline — lint → typecheck → unit test → build, per affected package (Turborepo `--filter`/remote cache to keep CI fast as the repo grows).

---

## 12. Engineering Guidelines

- Every module ships with its own spec doc in `docs/modules/` before implementation starts (see Section 8).
- Every module is independently testable — no module's tests depend on another module's runtime state.
- Domain logic is framework-agnostic; NestJS/FastAPI are delivery mechanisms, not where business rules live.
- All financial/trading calculations must be deterministic, unit-tested, and reviewed with extra scrutiny — correctness bugs in this domain have direct financial consequences for users.
- Security is not a phase — auth, input validation, and RBAC checks are part of Phase 3 implementation for every module, not bolted on later.
- No feature reaches `main` without documentation reflecting what was actually built (docs are versioned alongside code, not after it).

---

## 13. Project Roadmap (Modules, indicative order)

| # | Module | Depends On |
|---|---|---|
| 000 | Enterprise Foundation (this doc) | — |
| 001 | Auth, RBAC & Identity | 000 |
| 002 | Database Core Schema & Multi-Tenancy | 000, 001 |
| 003 | Subscription & Billing Platform | 001, 002 |
| 004 | Customer Portal Shell (web) | 001 |
| 005 | Admin Portal Shell | 001 |
| 006 | Notification Engine | 002 |
| 007 | Market Data Ingestion Layer | 002 |
| 008 | Trading Indicators Engine | 007 |
| 009 | Signal Platform | 007, 008 |
| 010 | Market Scanner | 007, 008 |
| 011 | Strategy Builder | 008, 009 |
| 012 | Portfolio Analytics | 002, 007 |
| 013 | AI Analysis Engine (apps/ai core) | 007 |
| 014 | AI Trading Assistant | 013, 009 |
| 015 | REST API Hardening & Public API / Mobile API | 001–012 |
| 016 | Observability, Rate Limiting & Hardening | all above |
| 017 | Mobile App API Contracts (future apps) | 015 |
| 018 | Desktop App API Contracts (future apps) | 015 |

This order is a starting proposal — sequencing can be revisited before Module 001 begins.

---

## 14. Explicit Non-Scope for Module 000

Per the kickoff mandate, this module does **not** include: application code, business modules, database schema implementation, or any AI/trading logic. Those begin at Module 001 onward, each gated by its own spec approval.

---

## Approval Checklist

- [ ] Folder structure approved
- [ ] Naming conventions approved
- [ ] Coding standards approved
- [ ] Git/branch strategy approved
- [ ] Environment strategy approved
- [ ] Docker architecture approved
- [ ] Dependency graph approved
- [ ] Initial package list approved
- [ ] Roadmap/module order approved (or revised)

**Awaiting your approval to proceed to Module 001.**
