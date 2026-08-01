import { planImportBatches } from "../import-batch-planner";

describe("planImportBatches", () => {
  it("returns an empty array when from >= to", () => {
    const from = new Date("2026-01-10T00:00:00Z");
    expect(planImportBatches(from, from)).toEqual([]);
    expect(planImportBatches(new Date("2026-01-10T00:00:00Z"), new Date("2026-01-09T00:00:00Z"))).toEqual([]);
  });

  it("returns a single batch when the range fits within one batch window", () => {
    const from = new Date("2026-01-01T00:00:00Z");
    const to = new Date("2026-01-05T00:00:00Z");
    const batches = planImportBatches(from, to, 30);
    expect(batches).toEqual([{ from, to }]);
  });

  it("splits a large range into fixed-size windows covering the full range with no gaps or overlaps", () => {
    const from = new Date("2026-01-01T00:00:00Z");
    const to = new Date("2026-04-01T00:00:00Z");
    const batches = planImportBatches(from, to, 30);

    expect(batches[0]!.from).toEqual(from);
    expect(batches[batches.length - 1]!.to).toEqual(to);
    for (let i = 1; i < batches.length; i++) {
      expect(batches[i]!.from).toEqual(batches[i - 1]!.to);
    }
    for (const batch of batches) {
      expect(batch.to.getTime()).toBeGreaterThan(batch.from.getTime());
      expect(batch.to.getTime() - batch.from.getTime()).toBeLessThanOrEqual(30 * 24 * 60 * 60 * 1000);
    }
  });

  it("respects a custom batch size", () => {
    const from = new Date("2026-01-01T00:00:00Z");
    const to = new Date("2026-01-11T00:00:00Z");
    const batches = planImportBatches(from, to, 5);
    expect(batches).toHaveLength(2);
    expect(batches[0]).toEqual({ from, to: new Date("2026-01-06T00:00:00Z") });
    expect(batches[1]).toEqual({ from: new Date("2026-01-06T00:00:00Z"), to });
  });
});
