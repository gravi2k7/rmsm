import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryTraceRepository } from "../in-memory-trace.repository";
import { AIRequestStatus } from "../../domain/enums/observability.enum";

describe("InMemoryTraceRepository", () => {
  let repository: InMemoryTraceRepository;

  beforeEach(() => {
    repository = new InMemoryTraceRepository();
  });

  it("saves and finds a request by id", async () => {
    const request = { id: "req-1", organizationId: null, status: AIRequestStatus.PENDING, startedAt: new Date(), completedAt: null };
    await repository.saveRequest(request);
    expect(await repository.findRequestById("req-1")).toEqual(request);
  });

  it("returns null for a missing request", async () => {
    expect(await repository.findRequestById("missing")).toBeNull();
  });

  it("saves provider traces and finds them scoped by requestId", async () => {
    await repository.saveProviderTrace({ requestId: "req-1", providerName: "openai", model: "gpt-5", startedAt: new Date(), completedAt: null, succeeded: null });
    await repository.saveProviderTrace({ requestId: "req-2", providerName: "openai", model: "gpt-5", startedAt: new Date(), completedAt: null, succeeded: null });

    const traces = await repository.findProviderTracesByRequestId("req-1");
    expect(traces).toHaveLength(1);
  });
});
