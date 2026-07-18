# AI-103 Strategy Engine — API Usage Guide

Base path: `/organizations/:organizationId/...` — every endpoint is organization-scoped and
bearer-authenticated (`OrganizationRoleGuard` + `@RequireOrgRole` + platform `PermissionsGuard`).

## Strategies

| Method | Path | Notes |
|---|---|---|
| `GET` | `/strategies` | Paginated list; filters: `status`, `category`, `tag`, `searchText` |
| `GET` | `/strategies/categories` | Category metadata (code + label) |
| `GET` | `/strategies/tags` | Distinct tags in use for the org |
| `GET` | `/strategies/:id` | Single strategy |
| `POST` | `/strategies` | Create — `{ name, description, category }` |
| `PUT` | `/strategies/:id` | Update — `{ name?, description?, addTags?, removeTags? }` |
| `DELETE` | `/strategies/:id` | Archive (soft — no hard delete anywhere in this platform) |
| `POST` | `/strategies/:id/clone` | Clone — `{ newName }`, copies the latest version's rules |
| `POST` | `/strategies/:id/publish` | Publish the strategy's latest `APPROVED` version |

## Versions

| Method | Path | Notes |
|---|---|---|
| `GET` | `/strategies/:id/versions` | List all versions of a strategy |
| `POST` | `/strategies/:id/versions` | Create a `DRAFT` — `{ entryRules, exitRules, parameters }` |
| `GET` | `/strategy-versions/:versionId` | Single version, including its rule trees |
| `POST` | `/strategy-versions/:versionId/validate` | `DRAFT → VALIDATED` (or stays `DRAFT` with findings) |
| `POST` | `/strategy-versions/:versionId/request-approval` | `VALIDATED → PENDING_APPROVAL` |
| `POST` | `/strategy-versions/:versionId/decide` | `{ decision: "APPROVED"\|"REJECTED", comments? }` |
| `POST` | `/strategy-versions/:versionId/publish` | `APPROVED → PUBLISHED` |
| `POST` | `/strategy-versions/:versionId/rollback` | Creates a new `DRAFT` copying this version |

## Rule tree wire format

`entryRules`/`exitRules` are a recursive JSON structure with no id field — `kind` is the only
discriminator:

```json
{
  "kind": "group",
  "operator": "AND",
  "children": [
    {
      "kind": "rule",
      "label": "RSI oversold",
      "enabled": true,
      "condition": {
        "leftOperand": { "kind": "indicator", "indicatorIdentifier": "rsi", "outputSeries": "value" },
        "operator": "LESS_THAN",
        "rightOperand": { "kind": "constant", "value": "30" }
      }
    }
  ]
}
```

Operand kinds: `indicator` (`indicatorIdentifier`, `outputSeries`, optional `parameters`),
`market_field` (`field`: one of `open`/`high`/`low`/`close`/`volume`), `constant` (`value`).
Comparison operators: `GREATER_THAN`, `GREATER_THAN_OR_EQUAL`, `LESS_THAN`,
`LESS_THAN_OR_EQUAL`, `EQUAL`, `NOT_EQUAL`, `CROSSES_ABOVE`, `CROSSES_BELOW`, `BETWEEN` (the only
operator using `rightOperandUpper`). Logical operators: `AND`, `OR`, `NOT`.

## Error model

Every error response: `{ statusCode, code?, message, details? }`. `code` is a stable, greppable
identifier (e.g. from a domain error hierarchy's own `code` field), mapped to HTTP status by a
dedicated exception filter keyed on `code` — never inferred from a long `instanceof` chain.
Client code should treat `code` (when present) as the stable contract, not `message`, which may
be reworded over time.

## Example: create → validate → approve → publish (curl)

```bash
ORG=00000000-0000-0000-0000-000000000000
TOKEN=eyJhbGciOi...
API=https://api.example.com/v1

# 1. Create the strategy
STRATEGY_ID=$(curl -s -X POST "$API/organizations/$ORG/strategies" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Momentum breakout","description":"...","category":"MOMENTUM"}' | jq -r .id)

# 2. Create a draft version
VERSION_ID=$(curl -s -X POST "$API/organizations/$ORG/strategies/$STRATEGY_ID/versions" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"entryRules":{"kind":"group","operator":"AND","children":[...]},"exitRules":{...},"parameters":[]}' \
  | jq -r .id)

# 3. Validate -> request approval -> approve -> publish
curl -s -X POST "$API/organizations/$ORG/strategy-versions/$VERSION_ID/validate" -H "Authorization: Bearer $TOKEN"
curl -s -X POST "$API/organizations/$ORG/strategy-versions/$VERSION_ID/request-approval" -H "Authorization: Bearer $TOKEN"
curl -s -X POST "$API/organizations/$ORG/strategy-versions/$VERSION_ID/decide" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"decision":"APPROVED"}'
curl -s -X POST "$API/organizations/$ORG/strategy-versions/$VERSION_ID/publish" -H "Authorization: Bearer $TOKEN"
```

Full Swagger documentation (summaries, examples, error responses per endpoint) is served by the
API itself — see the platform's own Swagger UI route rather than this guide for the authoritative,
always-current schema.
