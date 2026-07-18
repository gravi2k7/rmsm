import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import {
  ForeignKeyConstraintError,
  OptimisticLockError,
  RecordNotFoundError,
  UniqueConstraintViolationError,
  UnknownDatabaseError,
  translatePrismaError,
} from "../errors/database.errors";

function knownRequestError(code: string, meta?: Record<string, unknown>): Prisma.PrismaClientKnownRequestError {
  const error = new Prisma.PrismaClientKnownRequestError("mock error", { code, clientVersion: "5.22.0" });
  (error as { meta?: unknown }).meta = meta;
  return error;
}

describe("translatePrismaError", () => {
  it("maps P2025 to RecordNotFoundError", () => {
    const result = translatePrismaError(knownRequestError("P2025", { cause: "record-123" }), "Strategy");
    expect(result).toBeInstanceOf(RecordNotFoundError);
    expect(result.code).toBe("RECORD_NOT_FOUND");
  });

  it("maps P2002 to UniqueConstraintViolationError with the target fields", () => {
    const result = translatePrismaError(knownRequestError("P2002", { target: ["email"] }), "User");
    expect(result).toBeInstanceOf(UniqueConstraintViolationError);
    expect((result as UniqueConstraintViolationError).fields).toEqual(["email"]);
  });

  it("maps P2003 to ForeignKeyConstraintError", () => {
    const result = translatePrismaError(knownRequestError("P2003"), "Strategy");
    expect(result).toBeInstanceOf(ForeignKeyConstraintError);
  });

  it("maps an unrecognized Prisma error code to UnknownDatabaseError, preserving the code", () => {
    const result = translatePrismaError(knownRequestError("P2099"), "Strategy");
    expect(result).toBeInstanceOf(UnknownDatabaseError);
    expect((result as UnknownDatabaseError).prismaCode).toBe("P2099");
  });

  it("passes an existing DomainError through unchanged", () => {
    const original = new OptimisticLockError("Strategy", "abc");
    const result = translatePrismaError(original, "Strategy");
    expect(result).toBe(original);
  });

  it("wraps a plain Error as UnknownDatabaseError", () => {
    const result = translatePrismaError(new Error("connection reset"), "Strategy");
    expect(result).toBeInstanceOf(UnknownDatabaseError);
    expect(result.message).toBe("connection reset");
  });

  it("wraps a non-Error thrown value as UnknownDatabaseError without throwing itself", () => {
    const result = translatePrismaError("raw string", "Strategy");
    expect(result).toBeInstanceOf(UnknownDatabaseError);
    expect(result.message).toBe("raw string");
  });

  it("every translated error is a DomainError with a stable code", () => {
    const result = translatePrismaError(knownRequestError("P2025"), "Strategy");
    expect(typeof result.code).toBe("string");
    expect(result.code.length).toBeGreaterThan(0);
  });
});
