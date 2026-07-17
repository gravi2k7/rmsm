import { toStrategyParameterDomain, toStrategyParameterPersistence } from "../mappers/strategy-parameter.mapper";
import type { StrategyParameterDefinition } from "../../domain/value-objects/strategy-parameter.value-object";
import type { StrategyParameter as StrategyParameterRow } from "@rmsm/database";

/**
 * A mocked Prisma query RESULT row — every field here is a plain,
 * literal value of the shape a real `findMany`/`findUnique` actually
 * returns (`Prisma.JsonValue | null` for `allowedValues`, real
 * `Date`/`string`/`null` scalars elsewhere). Deliberately NOT derived
 * from `toStrategyParameterPersistence()`'s own output — that function
 * returns a CREATE/UPDATE INPUT shape (`Prisma.InputJsonValue |
 * typeof Prisma.JsonNull` for `allowedValues`), a genuinely different
 * type Prisma's own generated types keep separate from a query
 * result, and mixing the two was the real bug: `Prisma.JsonNull` (a
 * write-side sentinel telling Prisma what to WRITE) can never actually
 * appear as a value READ back from the database — a real read of a
 * null JSON column comes back as plain JS `null`.
 */
function buildRow(overrides: Partial<StrategyParameterRow> = {}): StrategyParameterRow {
  return {
    id: "p1",
    organizationId: "org1",
    strategyVersionId: "ver1",
    name: "risk_percent",
    type: "INTEGER",
    required: true,
    defaultValueText: null,
    minText: null,
    maxText: null,
    allowedValues: null,
    maxLength: null,
    sortOrder: 0,
    version: 1,
    createdById: null,
    updatedById: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

describe("strategy-parameter.mapper — read side (toStrategyParameterDomain), against genuine query-result-shaped rows", () => {
  it("reconstructs an INTEGER parameter with real min/max/default", () => {
    const row = buildRow({ type: "INTEGER", name: "risk_percent", required: true, defaultValueText: "2", minText: "1", maxText: "10" });
    const expected: StrategyParameterDefinition = { type: "integer", name: "risk_percent", required: true, defaultValue: 2, min: 1, max: 10 };
    expect(toStrategyParameterDomain(row)).toEqual(expected);
  });

  it("reconstructs a DECIMAL parameter, preserving exact string precision (no float loss)", () => {
    const row = buildRow({ type: "DECIMAL", name: "stop_loss_atr", required: false, defaultValueText: "1.50", minText: "0.10" });
    const result = toStrategyParameterDomain(row);
    expect(result.type === "decimal" && (result as { defaultValue?: string }).defaultValue).toBe("1.50");
  });

  it("reconstructs a BOOLEAN parameter correctly for both true and false (not just truthy/falsy text)", () => {
    const trueRow = buildRow({ id: "p1", type: "BOOLEAN", name: "use_trailing_stop", required: false, defaultValueText: "true" });
    const falseRow = buildRow({ id: "p2", type: "BOOLEAN", name: "use_trailing_stop", required: false, defaultValueText: "false" });

    expect(toStrategyParameterDomain(trueRow)).toEqual<StrategyParameterDefinition>({ type: "boolean", name: "use_trailing_stop", required: false, defaultValue: true });
    expect(toStrategyParameterDomain(falseRow)).toEqual<StrategyParameterDefinition>({ type: "boolean", name: "use_trailing_stop", required: false, defaultValue: false });
  });

  it("reconstructs an ENUM parameter with its allowedValues array — a real Prisma.JsonValue (a plain array), never the write-side Prisma.JsonNull sentinel", () => {
    const row = buildRow({ type: "ENUM", name: "timeframe", required: true, defaultValueText: "ONE_DAY", allowedValues: ["ONE_HOUR", "ONE_DAY", "ONE_WEEK"] });
    const expected: StrategyParameterDefinition = { type: "enum", name: "timeframe", required: true, defaultValue: "ONE_DAY", allowedValues: ["ONE_HOUR", "ONE_DAY", "ONE_WEEK"] };
    expect(toStrategyParameterDomain(row)).toEqual(expected);
  });

  it("reconstructs a STRING parameter with maxLength", () => {
    const row = buildRow({ type: "STRING", name: "notes", required: false, maxLength: 200 });
    const expected: StrategyParameterDefinition = { type: "string", name: "notes", required: false, maxLength: 200 };
    expect(toStrategyParameterDomain(row)).toEqual(expected);
  });

  it("a parameter with no stored default text reconstructs to defaultValue: undefined, not null or an empty string", () => {
    const row = buildRow({ type: "INTEGER", name: "period", required: true, defaultValueText: null });
    expect(toStrategyParameterDomain(row).defaultValue).toBeUndefined();
  });
});

describe("strategy-parameter.mapper — write side (toStrategyParameterPersistence), asserted on its own real CREATE/UPDATE-input shape", () => {
  it("serializes an INTEGER definition's own default/min/max to text", () => {
    const definition: StrategyParameterDefinition = { type: "integer", name: "risk_percent", required: true, defaultValue: 2, min: 1, max: 10 };
    const persistence = toStrategyParameterPersistence(definition, "org1", "ver1", 0);
    expect(persistence.defaultValueText).toBe("2");
    expect(persistence.minText).toBe("1");
    expect(persistence.maxText).toBe("10");
  });

  it("serializes a DECIMAL definition's own string values verbatim, with no numeric coercion", () => {
    const definition: StrategyParameterDefinition = { type: "decimal", name: "stop_loss_atr", required: false, defaultValue: "1.50", min: "0.10" };
    const persistence = toStrategyParameterPersistence(definition, "org1", "ver1", 0);
    expect(persistence.defaultValueText).toBe("1.50");
    expect(persistence.minText).toBe("0.10");
  });

  it("serializes an ENUM definition's own allowedValues as real JSON input, not the write-side null sentinel", () => {
    const definition: StrategyParameterDefinition = { type: "enum", name: "timeframe", required: true, allowedValues: ["ONE_HOUR", "ONE_DAY"] };
    const persistence = toStrategyParameterPersistence(definition, "org1", "ver1", 0);
    expect(persistence.allowedValues).toEqual(["ONE_HOUR", "ONE_DAY"]);
  });

  it("a definition with no default value serializes to a null defaultValueText, honestly (not an empty string standing in for absence)", () => {
    const definition: StrategyParameterDefinition = { type: "integer", name: "period", required: true };
    const persistence = toStrategyParameterPersistence(definition, "org1", "ver1", 0);
    expect(persistence.defaultValueText).toBeNull();
  });
});
