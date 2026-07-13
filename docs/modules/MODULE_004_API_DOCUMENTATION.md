# Module 004 — Billing & Subscription Management: API Documentation

All routes are under the global `/api/v1` prefix. "Platform perm" = Module 002's
`PermissionsGuard`; "Org role" = Module 003's `OrganizationRoleGuard`. An endpoint with both
requires a valid JWT AND the listed platform permission AND active membership with one of the
listed organization roles — see `ARCHITECTURE_DECISIONS.md` ADR-002/ADR-010 for why both layers
exist.

## Plans

| Method | Path | Auth | Summary |
|---|---|---|---|
| GET | `/billing/plans` | **Public** | List visible, active plans |

## Subscription (`/billing/organizations/:organizationId/subscription`)

| Method | Path | Platform perm | Org role | Summary |
|---|---|---|---|---|
| GET | `.../subscription` | `billing.subscription.read` | any | Get current subscription |
| POST | `.../subscription` | `billing.subscription.manage` | OWNER, ADMINISTRATOR | Create subscription |
| PATCH | `.../subscription` | `billing.subscription.manage` | OWNER, ADMINISTRATOR | Change plan |
| DELETE | `.../subscription` | `billing.subscription.manage` | OWNER, ADMINISTRATOR | Cancel subscription |

## Billing Account (`/billing/organizations/:organizationId/account`)

| Method | Path | Platform perm | Org role | Summary |
|---|---|---|---|---|
| GET | `.../account` | `billing.account.read` | any | Get billing account |
| POST | `.../account` | `billing.account.manage` | OWNER, ADMINISTRATOR | Create billing account |
| PATCH | `.../account` | `billing.account.manage` | OWNER, ADMINISTRATOR | Update billing account |

## Invoices (`/billing/organizations/:organizationId/invoices`) — List/Get only, by design (Section 6 of the Phase 4 doc)

| Method | Path | Platform perm | Org role | Summary |
|---|---|---|---|---|
| GET | `.../invoices` | `billing.invoice.read` | any | List invoices (paginated, filterable by status) |
| GET | `.../invoices/:invoiceId` | `billing.invoice.read` | any | Get invoice with line items |

## Payments (`/billing/organizations/:organizationId/payments`) — List only

| Method | Path | Platform perm | Org role | Summary |
|---|---|---|---|---|
| GET | `.../payments` | `billing.payment.read` | any | List payments (paginated) |

## Usage (`/billing/organizations/:organizationId/usage`)

| Method | Path | Platform perm | Org role | Summary |
|---|---|---|---|---|
| GET | `.../usage` | `billing.usage.read` | any | Current billing period usage |
| GET | `.../usage/history?metric=&monthsAgo=` | `billing.usage.read` | any | Historical usage for one metric |

## Coupons (`/billing/organizations/:organizationId/coupons`)

| Method | Path | Platform perm | Org role | Summary |
|---|---|---|---|---|
| POST | `.../coupons/validate` | `billing.coupon.apply` | OWNER, ADMINISTRATOR | Check eligibility without redeeming |
| POST | `.../coupons/apply` | `billing.coupon.apply` | OWNER, ADMINISTRATOR | Redeem a coupon onto a DRAFT invoice |
| DELETE | `.../coupons/invoices/:invoiceId` | `billing.coupon.apply` | OWNER, ADMINISTRATOR | Remove a coupon from a DRAFT invoice |

## Admin (`/billing/admin`) — platform-wide, not organization-scoped

| Method | Path | Platform perm | Summary |
|---|---|---|---|
| GET | `/billing/admin/plans` | `billing.admin.manage` | List all plans (incl. inactive) |
| POST | `/billing/admin/plans` | `billing.admin.manage` | Create a plan |
| POST | `/billing/admin/plans/:planId` | `billing.admin.manage` | Update a plan |
| GET | `/billing/admin/features` | `billing.admin.manage` | List feature flags |
| POST | `/billing/admin/features` | `billing.admin.manage` | Create a feature flag |
| GET | `/billing/admin/plans/:planId/features` | `billing.admin.manage` | List a plan's feature/quota grants |
| POST | `/billing/admin/plans/:planId/features` | `billing.admin.manage` | Grant/update a feature or quota on a plan |
| DELETE | `/billing/admin/plans/:planId/features/:featureFlagId` | `billing.admin.manage` | Revoke a feature grant |

## Webhooks (`/billing/webhooks/:provider`)

| Method | Path | Auth | Summary |
|---|---|---|---|
| POST | `/billing/webhooks/:provider` | **Public** (signature-verified) | Receive and process a provider webhook event |

`:provider` is one of `stripe`, `mock`, `razorpay`, `paddle`, `lemonsqueezy`, `paypal` (case-
insensitive) — see `PAYMENT_PROVIDER_CONFIGURATION.md` for how each provider's signature is
verified and what headers each one requires.

## Error Responses

Every error uses Module 002's standard envelope:
```json
{ "success": false, "data": null, "error": { "code": "...", "message": "...", "details": {} } }
```
Status codes: `400` (DTO validation, malformed webhook signature/provider), `401` (missing/
invalid JWT), `403` (insufficient platform permission or organization role), `404` (resource
not found, including "no such plan"), `409` (domain conflict — duplicate subscription, quota
exceeded, coupon already redeemed, invoice not DRAFT, etc.).

## Full Swagger

Every endpoint carries `@ApiOperation` with an explicit `operationId` and is discoverable at
`/api/docs` once the app is running — this document is a navigational summary, not a
duplicate of the generated OpenAPI spec, to avoid the two drifting apart.
