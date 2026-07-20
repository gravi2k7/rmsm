# RMSM Enterprise Trading Platform

# API_GUIDELINES.md

> **Document Version:** 1.0
>
> **Platform Version:** v2.4.0
>
> **Status:** Current
>
> **Last Updated:** <<Update Date>>

---

# Table of Contents

1. Purpose
2. API Design Principles
3. REST Standards
4. URL Structure
5. HTTP Methods
6. Resource Naming
7. Request Standards
8. Response Standards
9. Error Handling
10. Authentication
11. Authorization
12. Pagination
13. Filtering
14. Sorting
15. Validation
16. Versioning
17. Idempotency
18. Rate Limiting
19. Security
20. OpenAPI Standards
21. Testing
22. Deprecation Policy
23. Best Practices

---

# 1. Purpose

This document defines the API standards for all RMSM backend services.

Objectives:

- Consistency
- Predictability
- Security
- Scalability
- Maintainability

Every public API must follow these guidelines.

---

# 2. API Design Principles

APIs should be:

- RESTful
- Stateless
- Predictable
- Versioned
- Secure
- Backward compatible where practical
- Well documented
- Easy to consume

---

# 3. REST Standards

All APIs should follow REST conventions.

Example:

GET

```text
/api/v1/strategies
```

POST

```text
/api/v1/strategies
```

PUT

```text
/api/v1/strategies/{id}
```

DELETE

```text
/api/v1/strategies/{id}
```

---

# 4. URL Structure

General format

```text
/api/v1/{resource}
```

Examples

```text
/api/v1/auth

/api/v1/users

/api/v1/strategies

/api/v1/opportunities

/api/v1/orders

/api/v1/portfolio
```

Rules

- lowercase
- plural resources
- hyphen-separated names
- nouns instead of verbs

Correct

```text
/api/v1/market-data
```

Avoid

```text
/api/v1/getMarketData
```

---

# 5. HTTP Methods

| Method | Purpose |
|---------|----------|
| GET | Retrieve |
| POST | Create |
| PUT | Replace |
| PATCH | Partial Update |
| DELETE | Remove |

---

# 6. Resource Naming

Good examples

```text
users

organizations

strategies

opportunities

orders

portfolio
```

Nested resources

```text
/users/{id}/roles

/organizations/{id}/users

/portfolio/{id}/positions
```

---

# 7. Request Standards

Content-Type

```http
application/json
```

Accept

```http
application/json
```

Example

```http
POST /api/v1/strategies
```

```json
{
  "name": "Momentum Strategy",
  "description": "Trend following strategy",
  "enabled": true
}
```

---

# 8. Response Standards

Success Response

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

Collection Response

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 120,
    "totalPages": 6
  }
}
```

Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request.",
    "details": []
  }
}
```

---

# 9. Error Handling

Use standard HTTP status codes.

| Code | Meaning |
|------|----------|
|200|OK|
|201|Created|
|204|No Content|
|400|Bad Request|
|401|Unauthorized|
|403|Forbidden|
|404|Not Found|
|409|Conflict|
|422|Validation Error|
|429|Too Many Requests|
|500|Internal Server Error|

Errors should include:

- code
- message
- optional details

---

# 10. Authentication

Protected endpoints require JWT.

Example

```http
Authorization: Bearer <access_token>
```

Authentication endpoints

```text
POST /auth/login

POST /auth/logout

POST /auth/refresh

POST /auth/forgot-password

POST /auth/reset-password
```

---

# 11. Authorization

RBAC should be enforced.

Example

```text
Admin

Trader

Viewer
```

Authorization must occur:

- Controller guards
- Route guards
- Permission checks

---

# 12. Pagination

Supported query parameters

```text
?page=1

?pageSize=20
```

Response

```json
{
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 300,
    "totalPages": 15
  }
}
```

---

# 13. Filtering

Example

```text
GET /strategies?status=ACTIVE
```

Multiple filters

```text
GET /orders?status=OPEN&type=LIMIT
```

---

# 14. Sorting

Ascending

```text
?sort=name
```

Descending

```text
?sort=-createdAt
```

Multiple

```text
?sort=status,-createdAt
```

---

# 15. Validation

Use DTO validation.

Requirements

- Required fields
- Length validation
- Numeric validation
- Enum validation
- Email validation
- UUID validation

Reject invalid requests before reaching business logic.

---

# 16. Versioning

Use URI versioning.

```text
/api/v1

/api/v2
```

Avoid breaking existing versions whenever possible.

---

# 17. Idempotency

Safe methods

GET

PUT

DELETE

should be idempotent.

For critical POST operations (such as order submission or payment), consider supporting idempotency keys to prevent duplicate processing.

---

# 18. Rate Limiting

Recommended production limits

Authentication

```text
10 requests/minute
```

General API

```text
100 requests/minute
```

Administrative endpoints may have stricter limits depending on operational requirements.

---

# 19. Security

All APIs should:

- Require HTTPS
- Validate JWTs
- Validate input
- Sanitize output where appropriate
- Return generic error messages for authentication failures
- Avoid exposing internal implementation details

Never expose:

- Passwords
- Secrets
- Tokens
- Stack traces
- Database errors

---

# 20. OpenAPI Standards

Every endpoint should include:

- Summary
- Description
- Parameters
- Request schema
- Response schema
- Authentication requirements
- Example payloads
- Error responses

OpenAPI documentation should stay synchronized with implementation.

---

# 21. Testing

Every endpoint should have:

- Unit tests
- Integration tests
- Validation tests
- Authorization tests
- Error-path tests

Recommended coverage includes:

- Success cases
- Validation failures
- Authentication failures
- Authorization failures
- Boundary conditions

---

# 22. Deprecation Policy

When an endpoint is deprecated:

1. Mark it in documentation.
2. Announce the replacement.
3. Maintain compatibility during the deprecation period when feasible.
4. Remove it in the next planned major version.

Example

```text
Deprecated in v2.x

Removed in v3.0
```

---

# 23. Best Practices

Always

- Keep endpoints resource-oriented
- Validate all input
- Return consistent response structures
- Use standard HTTP status codes
- Document every endpoint
- Keep controllers lightweight
- Place business rules in the service/domain layer
- Maintain backward compatibility when practical

Avoid

- Business logic in controllers
- Inconsistent naming
- Breaking API changes in minor releases
- Returning sensitive information
- Silent failures
- Unstructured error responses

---

# Example Endpoint

Request

```http
GET /api/v1/strategies?page=1&pageSize=20&sort=-createdAt
Authorization: Bearer <token>
```

Response

```json
{
  "success": true,
  "data": [
    {
      "id": "stg_001",
      "name": "Momentum Strategy",
      "status": "ACTIVE"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

---

# Related Documents

- ARCHITECTURE.md
- SECURITY.md
- DEPLOYMENT.md
- CONTRIBUTING.md
- CHANGELOG.md

---

# Document History

| Version | Date | Notes |
|---------|------|-------|
| 1.0 | <<Update Date>> | Initial API guidelines |