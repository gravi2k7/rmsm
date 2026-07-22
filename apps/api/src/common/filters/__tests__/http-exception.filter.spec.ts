import { HttpStatus, HttpException, BadRequestException } from "@nestjs/common";
import { Prisma } from "@rmsm/database";
import { ValidationError } from "@rmsm/shared";
import { DomainError } from "@rmsm/core";
import { GlobalExceptionFilter } from "../http-exception.filter";

function buildHost(requestId = "req-123") {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const response = { status };
  const request = { requestId, method: "POST", url: "/api/v1/organizations" };
  const host = {
    switchToHttp: () => ({ getResponse: () => response, getRequest: () => request }),
  };
  return { host: host as never, status, json };
}

class TestDomainError extends DomainError {
  constructor(message: string, code: string) {
    super(message, code);
  }
}

describe("GlobalExceptionFilter (SEC-002)", () => {
  let filter: GlobalExceptionFilter;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
  });

  describe("Prisma error handling — real error instances, not mocks", () => {
    it("maps a real P2002 (unique constraint) error to a safe 409 response, never the raw Prisma message", () => {
      const { host, status, json } = buildHost();
      const raw = new Prisma.PrismaClientKnownRequestError("Unique constraint failed on the fields: (`slug`)\n  at /internal/query-engine/path.rs:42", {
        code: "P2002",
        clientVersion: "5.22.0",
        meta: { target: ["slug"] },
      });

      filter.catch(raw, host);

      expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      const body = json.mock.calls[0][0];
      expect(body.success).toBe(false);
      expect(body.error.message).toBe("A record with this slug already exists.");
      expect(body.error.message).not.toContain("query-engine");
      expect(body.error.message).not.toContain("Unique constraint failed");
      expect(JSON.stringify(body)).not.toContain(".rs:42");
    });

    it("maps a real P2025 (not found) error to a safe 404 response", () => {
      const { host, status, json } = buildHost();
      const raw = new Prisma.PrismaClientKnownRequestError("An operation failed because it depends on one or more records that were required but not found.", {
        code: "P2025",
        clientVersion: "5.22.0",
      });

      filter.catch(raw, host);

      expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      const body = json.mock.calls[0][0];
      expect(body.error.message).not.toContain("depends on one or more records");
    });

    it("maps an unrecognized Prisma error code to a safe generic 500, never the raw message", () => {
      const { host, status, json } = buildHost();
      const raw = new Prisma.PrismaClientKnownRequestError("Transaction failed due to a write conflict or a deadlock. Please retry your transaction (id abc123)", {
        code: "P2034",
        clientVersion: "5.22.0",
      });

      filter.catch(raw, host);

      expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      const body = json.mock.calls[0][0];
      expect(body.error.message).toBe("An unexpected database error occurred");
      expect(body.error.message).not.toContain("deadlock");
      expect(body.error.message).not.toContain("abc123");
    });

    it("maps a PrismaClientValidationError (malformed query) to a safe generic 500, not the raw query text", () => {
      const { host, status, json } = buildHost();
      const ValidationErrorCtor = Prisma.PrismaClientValidationError as unknown as new (message: string, options: { clientVersion: string }) => Prisma.PrismaClientValidationError;
      const raw = new ValidationErrorCtor(
        "Invalid `prisma.user.create()` invocation in\n/app/src/some-service.ts:88:20\n\n  87 const user = await this.prisma.user.create({\n> 88   data: { email: undefined }",
        { clientVersion: "5.22.0" },
      );

      filter.catch(raw, host);

      expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      const body = json.mock.calls[0][0];
      expect(body.error.message).not.toContain("some-service.ts");
      expect(body.error.message).not.toContain("prisma.user.create");
    });
  });

  describe("REGRESSION (SEC-002): generic unexpected errors no longer leak their raw message", () => {
    it("a plain, unrecognized Error is reported with the safe generic message, not its own .message", () => {
      const { host, status, json } = buildHost();
      const raw = new Error("connect ECONNREFUSED 10.0.4.12:5432 — internal db host unreachable");

      filter.catch(raw, host);

      expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      const body = json.mock.calls[0][0];
      expect(body.error.message).toBe("An unexpected error occurred");
      expect(body.error.message).not.toContain("10.0.4.12");
      expect(body.error.message).not.toContain("ECONNREFUSED");
    });

    it("a non-Error thrown value also gets the safe generic message", () => {
      const { host, status, json } = buildHost();

      filter.catch("a bare string throw with internal detail: /etc/passwd", host);

      expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      const body = json.mock.calls[0][0];
      expect(body.error.message).toBe("An unexpected error occurred");
      expect(body.error.message).not.toContain("/etc/passwd");
    });
  });

  describe("existing behavior preserved — no regression", () => {
    it("still handles AppError exactly as before", () => {
      const { host, status, json } = buildHost();
      filter.catch(new ValidationError("email is invalid", { field: "email" }), host);
      expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      const body = json.mock.calls[0][0];
      expect(body.error.code).toBe("VALIDATION_ERROR");
      expect(body.error.message).toBe("email is invalid");
    });

    it("still handles HttpException exactly as before", () => {
      const { host, status, json } = buildHost();
      filter.catch(new BadRequestException("bad input"), host);
      expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      const body = json.mock.calls[0][0];
      expect(body.error.message).toBe("bad input");
    });

    it("still maps DomainError via mapDomainErrorToAppError exactly as before", () => {
      const { host, status } = buildHost();
      filter.catch(new TestDomainError('Strategy "abc" is not known.', "ENTITY_NOT_FOUND"), host);
      expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    });

    it("still surfaces requestId in the response meta", () => {
      const { host, json } = buildHost("req-abc-123");
      filter.catch(new HttpException("x", HttpStatus.I_AM_A_TEAPOT), host);
      const body = json.mock.calls[0][0];
      expect(body.meta.requestId).toBe("req-abc-123");
    });
  });
});
