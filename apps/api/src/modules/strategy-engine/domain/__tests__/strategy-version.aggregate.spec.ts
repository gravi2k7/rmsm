import { StrategyVersion } from "../aggregates/strategy-version.aggregate";
import { RuleGroup } from "../entities/rule-group.entity";
import { InvalidVersionTransitionError, ImmutablePublishedVersionError } from "../errors/strategy-domain.errors";

function buildVersion(status: StrategyVersion["status"] = "DRAFT"): StrategyVersion {
  const emptyGroup = new RuleGroup("group-1", "AND", []);
  return new StrategyVersion("ver-1", "strat-1", 1, status, emptyGroup, emptyGroup, [], "user-1", new Date());
}

describe("StrategyVersion aggregate", () => {
  describe("lifecycle transitions", () => {
    it("allows the full happy path: DRAFT -> PENDING_VALIDATION -> VALIDATED -> PENDING_APPROVAL -> APPROVED -> PUBLISHED -> SUPERSEDED", () => {
      const version = buildVersion();
      version.transitionTo("PENDING_VALIDATION");
      version.transitionTo("VALIDATED");
      version.transitionTo("PENDING_APPROVAL");
      version.transitionTo("APPROVED");
      version.transitionTo("PUBLISHED");
      version.transitionTo("SUPERSEDED");
      expect(version.status).toBe("SUPERSEDED");
    });

    it("rejects skipping a state (DRAFT -> PUBLISHED directly)", () => {
      const version = buildVersion();
      expect(() => version.transitionTo("PUBLISHED")).toThrow(InvalidVersionTransitionError);
    });

    it("allows a REJECTED version to return to DRAFT — rejection is actionable, not terminal", () => {
      const version = buildVersion("PENDING_APPROVAL");
      version.transitionTo("REJECTED");
      expect(() => version.transitionTo("DRAFT")).not.toThrow();
    });

    it("PUBLISHED has exactly one valid next state: SUPERSEDED", () => {
      const version = buildVersion("PUBLISHED");
      expect(() => version.transitionTo("DRAFT")).toThrow(InvalidVersionTransitionError);
      expect(() => version.transitionTo("SUPERSEDED")).not.toThrow();
    });

    it("SUPERSEDED is terminal — no further transition succeeds", () => {
      const version = buildVersion("SUPERSEDED");
      expect(() => version.transitionTo("DRAFT")).toThrow(InvalidVersionTransitionError);
    });
  });

  describe("immutability once published", () => {
    it("allows editing entry/exit rules and parameters while still DRAFT", () => {
      const version = buildVersion("DRAFT");
      const newGroup = new RuleGroup("group-2", "OR", []);
      expect(() => version.updateEntryRules(newGroup)).not.toThrow();
      expect(() => version.updateExitRules(newGroup)).not.toThrow();
      expect(() => version.updateParameters([])).not.toThrow();
    });

    it("throws ImmutablePublishedVersionError when attempting to edit a PUBLISHED version's rules", () => {
      const version = buildVersion("PUBLISHED");
      const newGroup = new RuleGroup("group-2", "OR", []);
      expect(() => version.updateEntryRules(newGroup)).toThrow(ImmutablePublishedVersionError);
      expect(() => version.updateExitRules(newGroup)).toThrow(ImmutablePublishedVersionError);
      expect(() => version.updateParameters([])).toThrow(ImmutablePublishedVersionError);
    });

    it("throws ImmutablePublishedVersionError for a SUPERSEDED version too, not just PUBLISHED", () => {
      const version = buildVersion("SUPERSEDED");
      const newGroup = new RuleGroup("group-2", "OR", []);
      expect(() => version.updateEntryRules(newGroup)).toThrow(ImmutablePublishedVersionError);
    });
  });
});
