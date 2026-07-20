# RMSM Enterprise Trading Platform

# ARCHITECTURE.md

> **Document Version:** 1.0
>
> **Architecture Version:** v2.4.0
>
> **Status:** Current
>
> **Last Updated:** <<Update Date>>

---

# Table of Contents

1. Introduction
2. Architecture Principles
3. High-Level System Architecture
4. Repository Architecture
5. Technology Stack
6. Domain-Driven Design
7. Backend Architecture
8. Frontend Architecture
9. Shared Packages
10. Authentication & Authorization
11. API Architecture
12. Data Architecture
13. Application Architecture
14. UI Architecture
15. State Management
16. Testing Strategy
17. Build & Deployment Architecture
18. Security Architecture
19. Observability
20. Performance Strategy
21. Future Architecture
22. Design Decisions

---

# 1. Introduction

RMSM (Ravi Market Strategy Management) is an enterprise-grade trading platform designed using Domain-Driven Design (DDD), Clean Architecture, and a modular monorepo.

The platform provides:

- Enterprise REST API
- Enterprise Admin Console
- Enterprise Trader Web
- Shared Domain Packages
- Centralized Authentication
- Scalable Architecture for AI Expansion

---

# 2. Architecture Principles

The platform follows these principles:

- Domain-Driven Design (DDD)
- Clean Architecture
- Separation of Concerns
- Modular Monorepo
- API First
- Strong Typing
- Test-Driven Validation
- Reusable Components
- Feature-Based Frontend
- Incremental Delivery

---

# 3. High-Level System Architecture

```text
                        +---------------------------+
                        |      Trader Web          |
                        |      (Next.js 15)        |
                        +------------+-------------+
                                     |
                                     |
                        +------------v-------------+
                        |     Enterprise API       |
                        |        (NestJS)          |
                        +------------+-------------+
                                     |
              +----------------------+----------------------+
              |                      |                      |
     +--------v-------+    +---------v--------+    +--------v-------+
     | Business       |    | Shared Services  |    | Infrastructure |
     | Domains        |    |                  |    |                |
     +----------------+    +------------------+    +----------------+
              |
              |
     +--------v--------+
     | PostgreSQL      |
     | Prisma ORM      |
     +-----------------+
```

---

# 4. Repository Architecture

```text
rmsm/
│
├── apps/
│   ├── api/
│   ├── admin/
│   └── web/
│
├── packages/
│   ├── core/
│   ├── market/
│   ├── strategy/
│   ├── opportunity/
│   ├── decision/
│   ├── execution/
│   ├── portfolio/
│   ├── database/
│   ├── shared/
│   ├── ui/
│   ├── logging/
│   ├── health/
│   ├── config/
│   └── types/
│
├── infra/
├── docs/
└── scripts/
```

---

# 5. Technology Stack

## Frontend

- Next.js 15
- React 19
- TypeScript
- TailwindCSS
- shadcn/ui
- TanStack Query
- TanStack Table
- Zustand
- React Hook Form
- Zod
- Recharts
- TradingView Advanced Chart

## Backend

- NestJS
- Prisma ORM
- PostgreSQL
- JWT Authentication
- Swagger / OpenAPI

## Infrastructure

- TurboRepo
- pnpm Workspace
- Docker
- GitHub

---

# 6. Domain-Driven Design

The business domain is organized into independent bounded contexts.

```text
Market
      │
      ▼
Strategy
      │
      ▼
Opportunity
      │
      ▼
Decision
      │
      ▼
Execution
      │
      ▼
Portfolio
```

Each domain owns:

- Entities
- Value Objects
- Aggregates
- Domain Services
- Repository Interfaces
- Domain Events

Dependencies flow inward toward the domain.

---

# 7. Backend Architecture

```text
Controller
      │
DTO
      │
Application Service
      │
Domain
      │
Repository Interface
      │
Persistence
      │
Database
```

Responsibilities:

- Controllers expose REST endpoints.
- DTOs validate requests and responses.
- Application Services orchestrate use cases.
- Domains contain business rules.
- Repository interfaces abstract persistence.
- Persistence adapters interact with Prisma.

---

# 8. Frontend Architecture

The frontend is feature-based.

```text
features/
│
├── auth/
├── market/
├── strategy/
├── opportunity/
├── decision/
├── execution/
├── portfolio/
├── analytics/
├── notifications/
└── profile/
```

Each feature contains:

- Components
- Hooks
- Types
- Utilities
- Tests

---

# 9. Shared Packages

Shared packages provide reusable functionality.

| Package | Responsibility |
|----------|----------------|
| core | Core utilities |
| shared | Shared logic |
| types | Shared types |
| ui | Shared UI components |
| config | Configuration |
| logging | Logging |
| health | Health monitoring |
| database | Prisma client |

---

# 10. Authentication & Authorization

Authentication

- JWT
- Refresh Tokens
- Remember Me
- Session Management
- Password Reset
- Two-Factor Authentication

Authorization

- RBAC
- Permission Guards
- Route Guards
- API Guards

---

# 11. API Architecture

REST API follows:

```text
Client
    │
    ▼
Controller
    │
Application Layer
    │
Domain
    │
Repository
```

Key characteristics:

- Versioned APIs
- DTO validation
- Pagination
- Filtering
- Sorting
- Consistent error responses

---

# 12. Data Architecture

Persistence:

```text
Application
      │
Repository Interface
      │
Prisma Adapter
      │
PostgreSQL
```

Design goals:

- Repository abstraction
- Replaceable persistence
- Testability

---

# 13. Application Architecture

Applications:

### Enterprise API

Provides business functionality.

### Enterprise Admin

Administrative operations.

### Enterprise Trader Web

Trader workflows and analytics.

Each application consumes shared domain packages.

---

# 14. UI Architecture

UI principles:

- Responsive
- Accessible
- Reusable
- Feature-based
- Component-driven

Shared components include:

- Tables
- Forms
- Dialogs
- Cards
- Charts
- Navigation

---

# 15. State Management

Server State

- TanStack Query

Client State

- Zustand

Form State

- React Hook Form

Validation

- Zod

---

# 16. Testing Strategy

Validation pipeline:

```text
pnpm lint
      │
pnpm typecheck
      │
pnpm test
      │
pnpm build
```

Testing levels:

- Unit
- Component
- Integration

Every milestone must pass all four validation gates.

---

# 17. Build & Deployment Architecture

```text
Developer
      │
Git
      │
TurboRepo
      │
pnpm
      │
Docker
      │
Production
```

---

# 18. Security Architecture

Security features include:

- JWT
- Refresh Tokens
- RBAC
- Password Hashing
- Route Guards
- Permission Guards
- Session Management
- Security Headers (planned)
- Rate Limiting (planned)

---

# 19. Observability

Current:

- Structured Logging
- Health Checks

Planned:

- Metrics
- Distributed Tracing
- Alerting
- Dashboards

---

# 20. Performance Strategy

Current practices:

- Code splitting
- Lazy loading
- Query caching
- Typed APIs
- Feature isolation

Future work:

- Bundle optimization
- CDN integration
- Advanced caching

---

# 21. Future Architecture

Phase 5

Production Readiness

- Security hardening
- Observability
- Deployment automation
- Operational tooling

Phase 6

AI Platform

- AI Strategy Assistant
- AI Opportunity Analysis
- AI Decision Support
- AI Portfolio Insights
- Natural-language workflows

---

# 22. Design Decisions

The following architectural decisions guide RMSM:

1. Domain logic resides only in domain packages.
2. Frontend consumes the API and does not implement business rules.
3. Shared packages prevent duplication.
4. Repository interfaces isolate persistence.
5. Feature-based frontend organization improves scalability.
6. Every milestone must pass lint, typecheck, test, and build before release.
7. Temporary client-side implementations are explicitly documented until backend support exists.

---

# Glossary

| Term | Description |
|------|-------------|
| DDD | Domain-Driven Design |
| RBAC | Role-Based Access Control |
| DTO | Data Transfer Object |
| API | Application Programming Interface |
| ORM | Object-Relational Mapping |
| JWT | JSON Web Token |
| UI | User Interface |
| UX | User Experience |

---

# Document History

| Version | Date | Notes |
|---------|------|-------|
| 1.0 | <<Update Date>> | Initial architecture documentation |