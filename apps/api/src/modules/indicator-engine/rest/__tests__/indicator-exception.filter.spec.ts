import { HttpStatus } from "@nestjs/common";
import { IndicatorExceptionFilter } from "../filters/indicator-exception.filter";
import { InvalidParameterError } from "../../contracts/validation.interface";
import { InvalidVersionError, DuplicateDefinitionError } from "../../contracts/registry-validation.errors";
import { IndicatorNotFoundException, CalculationWindowException } from "../../contracts/execution.errors";
import { DependencyNotFoundException, CircularDependencyException } from "../../contracts/graph.errors";
import { RegistryServiceException } from "../../contracts/service.errors";

function buildHost(requestId = "req-123") {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const response = { status };
  const request = { requestId, method: "GET", url: "/api/v1/indicators/ema" };
  const host = {
    switchToHttp: () => ({ getResponse: () => response, getRequest: () => request }),
  };
  return { host: host as never, status, json };
}

describe("IndicatorExceptionFilter", () => {
  let filter: IndicatorExceptionFilter;

  beforeEach(() => {
    filter = new IndicatorExceptionFilter();
  });

  it("maps a NotFound-flavored error to 404", () => {
    const { host, status } = buildHost();
    filter.catch(new IndicatorNotFoundException("not found"), host);
    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
  });

  it("maps DependencyNotFoundException to 404", () => {
    const { host, status } = buildHost();
    filter.catch(new DependencyNotFoundException("missing dep"), host);
    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
  });

  it("maps a duplicate-definition error to 409", () => {
    const { host, status } = buildHost();
    filter.catch(new DuplicateDefinitionError("dup"), host);
    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
  });

  it("maps a service-layer wrapper error to 500", () => {
    const { host, status } = buildHost();
    filter.catch(new RegistryServiceException("wrapped"), host);
    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
  });

  it("maps a generic validation error to 422", () => {
    const { host, status } = buildHost();
    filter.catch(new InvalidParameterError("bad param"), host);
    expect(status).toHaveBeenCalledWith(HttpStatus.UNPROCESSABLE_ENTITY);
  });

  it("maps InvalidVersionError to 422", () => {
    const { host, status } = buildHost();
    filter.catch(new InvalidVersionError("bad version"), host);
    expect(status).toHaveBeenCalledWith(HttpStatus.UNPROCESSABLE_ENTITY);
  });

  it("maps CircularDependencyException to 422", () => {
    const { host, status } = buildHost();
    filter.catch(new CircularDependencyException("cycle"), host);
    expect(status).toHaveBeenCalledWith(HttpStatus.UNPROCESSABLE_ENTITY);
  });

  it("maps CalculationWindowException to 422", () => {
    const { host, status } = buildHost();
    filter.catch(new CalculationWindowException("bad window"), host);
    expect(status).toHaveBeenCalledWith(HttpStatus.UNPROCESSABLE_ENTITY);
  });

  it("never exposes an internal stack trace in the response body", () => {
    const { host, json } = buildHost();
    const error = new IndicatorNotFoundException("not found");
    filter.catch(error, host);
    const body = json.mock.calls[0][0];
    expect(JSON.stringify(body)).not.toContain(error.stack?.split("\n")[0]);
    expect(body).not.toHaveProperty("stack");
  });

  it("includes the request's own requestId in the error response meta", () => {
    const { host, json } = buildHost("correlation-abc");
    filter.catch(new IndicatorNotFoundException("not found"), host);
    const body = json.mock.calls[0][0];
    expect(body.meta.requestId).toBe("correlation-abc");
  });

  it("response body matches the platform's standard ApiResponse envelope shape", () => {
    const { host, json } = buildHost();
    filter.catch(new IndicatorNotFoundException("ema not found"), host);
    const body = json.mock.calls[0][0];
    expect(body).toMatchObject({ success: false, data: null, error: { code: "IndicatorNotFound", message: "ema not found" } });
  });
});
