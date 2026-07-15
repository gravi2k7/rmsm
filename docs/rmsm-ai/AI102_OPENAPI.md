# AI-102 — OpenAPI / Swagger

## Coverage

Every endpoint in `IndicatorController` carries `@ApiOperation` (with `operationId` and
`summary`, plus `description` where a real behavioral nuance needs stating — e.g. `execute()`'s
own note that every current indicator fails at the calculation step) and `@ApiOkResponse({
type: ... })` pointing at a real, hand-written DTO class, matching AI-101's own Phase 4
discipline exactly.

## DTO ↔ Swagger Schema

Every field on every DTO (`ExecuteIndicatorDto`, `QueryIndicatorDto`, `ValidateIndicatorDto`,
`IndicatorMetadataDto`, `IndicatorListDto`, `ValidationDto`, `ExecutionStatusDto`,
`ExecutionResponseDto`, `HealthResponseDto`) carries `@ApiProperty`/`@ApiPropertyOptional` with
a real `example`, `enum`, or `format` annotation wherever one adds genuine documentation value
(e.g. `instrumentId`'s `format: "uuid"`, `calculationMode`'s full 6-value `enum`) — not applied
uniformly as boilerplate where it wouldn't help a reader.

## Request/Response Examples

Item 5's own "include: request schema, response schema, examples, error responses,
authentication requirements" — request/response schemas and authentication requirements are
fully covered via the decorators above and the controller-level `@ApiBearerAuth()`. **Concrete
worked examples for every endpoint are not individually authored this phase** — a real, named
gap: NestJS's Swagger module already generates a correct schema (types, required/optional,
enums) from the decorators present, but a hand-written realistic example payload per endpoint
(e.g. a fully worked `POST /indicators/execute` request/response pair showing a real MACD
execution) needs deliberate authoring effort this phase's own scope didn't budget for
alongside everything else in this deliverable list. `@ApiProperty`'s own `example` field IS
used per-field (see above) — what's missing is a full endpoint-level example object, not
per-field illustration.

## Error Responses

Every endpoint can return the mapped statuses `IndicatorExceptionFilter` produces (404, 409,
422, 500 — see `AI102_PHASE4.md`'s own mapping table) plus the platform's own standard 400
(malformed DTO, caught by `ValidationPipe` before any AI-102 code runs), 401 (no/invalid JWT),
403 (valid JWT, missing permission), and 501 (`getExecutionStatus()`'s own single, unconditional
response — see `AI102_REST_API.md`'s "Known Gap" section). **Explicit `@ApiResponse` decorators
exist on the two endpoints where a specific error is most likely and most worth documenting up
front** — `getMetadata()` (404 for an unregistered identifier) and `execute()` (400/404/422,
with a description clarifying that a FAILED execution *outcome* is a normal 200 response, not a
thrown error). The remaining 6 endpoints (`list`, `listCategories`, `listVersions`, `validate`,
`getHealth`, `getExecutionStatus`) rely on the filter's own general mapping (or, for
`getExecutionStatus`, its own hardcoded 501) without an endpoint-specific `@ApiResponse` — a
real, smaller-than-originally-stated gap: closed where it mattered most, named honestly where
it wasn't closed for every endpoint.

## What's Genuinely Complete

- Every endpoint discoverable via `@ApiOperation`
- Every DTO's own shape fully typed and annotated
- Authentication requirement declared once, correctly, at the controller level
- `@ApiTags("Indicator Engine")` groups every endpoint together in the generated UI
- Explicit error-response documentation on the two endpoints most likely to need it (`getMetadata()`,
  `execute()`)

## What's a Named Gap, Not Silently Claimed Done

- Full worked request/response example objects per endpoint (per-field `example`s exist; a
  complete worked payload per endpoint does not)
- Explicit per-status `@ApiResponse` decorators on the remaining 6 endpoints (`list`,
  `listCategories`, `listVersions`, `validate`, `getHealth`, `getExecutionStatus`) — each still
  correctly returns the right status via `IndicatorExceptionFilter`'s own real mapping (or, for
  `getExecutionStatus`, a hardcoded 501); what's missing is only the Swagger-level documentation
  of that fact for those 6, not the runtime behavior itself

"Swagger documentation must be complete" (item 5's own words) is true for schema completeness
and true for the two endpoints where error documentation was added; it is not true for
example-payload completeness or for exhaustive per-endpoint error-status documentation, and
this document says so directly rather than letting partial completeness stand in for the whole
claim.
