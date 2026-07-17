import { Strategy } from "../aggregates/strategy.aggregate";
import { InvalidStrategyStateError, DuplicateTagError, InvalidTagFormatError } from "../errors/strategy-domain.errors";

function buildStrategy(): Strategy {
  return new Strategy("strat-1", "org-1", "RSI Mean Reversion", "Buys oversold, sells overbought.", "MEAN_REVERSION", [], "ACTIVE", null, "user-1", new Date());
}

describe("Strategy aggregate", () => {
  it("starts with the given name, description, and empty tags", () => {
    const strategy = buildStrategy();
    expect(strategy.name).toBe("RSI Mean Reversion");
    expect(strategy.tags).toEqual([]);
  });

  it("rename() updates the name on an active strategy", () => {
    const strategy = buildStrategy();
    strategy.rename("RSI Mean Reversion v2");
    expect(strategy.name).toBe("RSI Mean Reversion v2");
  });

  it("addTag() accepts a well-formed tag", () => {
    const strategy = buildStrategy();
    strategy.addTag("backtested-2026");
    expect(strategy.tags).toContain("backtested-2026");
  });

  it("addTag() rejects a malformed tag (uppercase, spaces, too long)", () => {
    const strategy = buildStrategy();
    expect(() => strategy.addTag("Not Valid!")).toThrow(InvalidTagFormatError);
  });

  it("addTag() rejects a duplicate tag", () => {
    const strategy = buildStrategy();
    strategy.addTag("volatile-pairs");
    expect(() => strategy.addTag("volatile-pairs")).toThrow(DuplicateTagError);
  });

  it("removeTag() removes an existing tag without error, and is a no-op for a tag that isn't present", () => {
    const strategy = buildStrategy();
    strategy.addTag("needs-review");
    strategy.removeTag("needs-review");
    expect(strategy.tags).not.toContain("needs-review");
    expect(() => strategy.removeTag("never-added")).not.toThrow();
  });

  it("archive() transitions status to ARCHIVED", () => {
    const strategy = buildStrategy();
    strategy.archive();
    expect(strategy.status).toBe("ARCHIVED");
  });

  it("archive() throws if already archived — not a silent no-op", () => {
    const strategy = buildStrategy();
    strategy.archive();
    expect(() => strategy.archive()).toThrow(InvalidStrategyStateError);
  });

  it("every mutating method throws once the strategy is archived — no in-place edits to an archived record", () => {
    const strategy = buildStrategy();
    strategy.archive();
    expect(() => strategy.rename("New Name")).toThrow(InvalidStrategyStateError);
    expect(() => strategy.updateDescription("New description")).toThrow(InvalidStrategyStateError);
    expect(() => strategy.addTag("test")).toThrow(InvalidStrategyStateError);
  });

  it("recordPublishedVersion() updates currentPublishedVersionId", () => {
    const strategy = buildStrategy();
    strategy.recordPublishedVersion("version-1");
    expect(strategy.currentPublishedVersionId).toBe("version-1");
  });
});
