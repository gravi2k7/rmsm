import { describe, it, expect } from "vitest";
import { StubSearchProvider } from "../stub-search.provider";

describe("StubSearchProvider", () => {
  it("returns seeded results for a matching query", async () => {
    const provider = new StubSearchProvider();
    provider.seed("cats", [{ source: { id: "s1", title: "About Cats" }, snippet: "Cats are mammals." }]);

    const results = await provider.search("cats");
    expect(results).toHaveLength(1);
    expect(results[0]?.snippet).toBe("Cats are mammals.");
  });

  it("returns an empty array for an unseeded query", async () => {
    const provider = new StubSearchProvider();
    expect(await provider.search("unknown")).toEqual([]);
  });
});
