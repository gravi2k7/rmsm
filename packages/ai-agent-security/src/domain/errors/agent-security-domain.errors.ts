import { DomainError } from "@rmsm/core";

export class RoleNotFoundError extends DomainError {
  constructor(roleName: string) {
    super(`Role not found: ${roleName}`, "ROLE_NOT_FOUND");
  }
}

export class RoleAlreadyExistsError extends DomainError {
  constructor(roleName: string) {
    super(`Role already exists: ${roleName}`, "ROLE_ALREADY_EXISTS");
  }
}

export class SecretNotFoundError extends DomainError {
  constructor(name: string) {
    super(`Secret not found: ${name}`, "SECRET_NOT_FOUND");
  }
}

export class RateLimitExceededError extends DomainError {
  constructor(key: string) {
    super(`Rate limit exceeded for: ${key}`, "RATE_LIMIT_EXCEEDED");
  }
}
