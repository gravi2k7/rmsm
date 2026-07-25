import { describe, expect, it } from "vitest";
import { InMemorySharedContextStore } from "../in-memory-shared-context.store";

describe("InMemorySharedContextStore", () => {
  it("stores and retrieves values, and lists a full snapshot", async () => {
    const store = new InMemorySharedContextStore();
    await store.set("plan", { step: 1 }, "coordinator-1");
    await store.set("status", "in-progress", "worker-1");

    expect(await store.get("plan")).toEqual({ step: 1 });
    expect(await store.all()).toEqual({ plan: { step: 1 }, status: "in-progress" });
  });
});
