import { RegistryValidatorService } from "../registry-validator.service";
import { IndicatorRegistryService } from "../indicator-registry.service";
import {
  DuplicateDefinitionError,
  InvalidVersionError,
  InvalidParameterDefinitionError,
  InvalidCategoryError,
  InvalidDependencyError,
  UnsupportedTimeframeDefinitionError,
  MalformedMetadataError,
} from "../../contracts/registry-validation.errors";
import type { IndicatorDefinition } from "../../contracts/indicator-definition.interface";

function buildDefinition(overrides: Partial<IndicatorDefinition> = {}): IndicatorDefinition {
  return {
    identifier: "test_indicator",
    displayName: "Test Indicator",
    version: "1.0.0",
    description: "A test indicator.",
    category: "TREND",
    inputs: [],
    outputs: [{ name: "value", kind: "line" }],
    defaultParameters: {},
    supportedTimeframes: ["ONE_DAY"],
    minimumLookback: 14,
    dependencies: [],
    tags: [],
    author: "Test Author",
    stabilityLevel: "stable",
    metadata: { calculationType: "windowed", deterministic: true, cacheable: true, incrementalSupport: false },
    ...overrides,
  };
}

describe("RegistryValidatorService", () => {
  let validator: RegistryValidatorService;
  let registry: IndicatorRegistryService;

  beforeEach(() => {
    validator = new RegistryValidatorService();
    registry = new IndicatorRegistryService(validator);
  });

  it("accepts a genuinely well-formed definition", () => {
    expect(() => validator.validate(buildDefinition(), registry)).not.toThrow();
  });

  it("rejects malformed metadata: missing identifier/displayName/description", () => {
    expect(() => validator.validate(buildDefinition({ identifier: "" }), registry)).toThrow(MalformedMetadataError);
  });

  it("rejects malformed metadata: deterministic: false", () => {
    expect(() =>
      validator.validate(buildDefinition({ metadata: { calculationType: "windowed", deterministic: false, cacheable: true, incrementalSupport: false } }), registry),
    ).toThrow(MalformedMetadataError);
  });

  it("rejects an invalid semver version string", () => {
    expect(() => validator.validate(buildDefinition({ version: "not-a-version" }), registry)).toThrow(InvalidVersionError);
  });

  it("rejects a duplicate (identifier, version) pair", () => {
    registry.register(buildDefinition());
    expect(() => validator.validate(buildDefinition(), registry)).toThrow(DuplicateDefinitionError);
  });

  it("rejects an unrecognized category", () => {
    expect(() => validator.validate(buildDefinition({ category: "NOT_A_REAL_CATEGORY" as never }), registry)).toThrow(InvalidCategoryError);
  });

  it("rejects a parameter with an unrecognized type", () => {
    const bad = buildDefinition({ inputs: [{ type: "not_a_type" as never, name: "x", required: true }] });
    expect(() => validator.validate(bad, registry)).toThrow(InvalidParameterDefinitionError);
  });

  it("rejects an enum parameter with no allowedValues", () => {
    const bad = buildDefinition({ inputs: [{ type: "enum", name: "x", required: true, allowedValues: [] }] });
    expect(() => validator.validate(bad, registry)).toThrow(InvalidParameterDefinitionError);
  });

  it("rejects a definition with zero supported timeframes", () => {
    expect(() => validator.validate(buildDefinition({ supportedTimeframes: [] }), registry)).toThrow(UnsupportedTimeframeDefinitionError);
  });

  it("rejects an unrecognized timeframe value", () => {
    expect(() => validator.validate(buildDefinition({ supportedTimeframes: ["TWO_MINUTES" as never] }), registry)).toThrow(UnsupportedTimeframeDefinitionError);
  });

  it("rejects a dependency identifier that isn't registered", () => {
    expect(() => validator.validate(buildDefinition({ dependencies: ["does_not_exist"] }), registry)).toThrow(InvalidDependencyError);
  });

  it("accepts a dependency identifier that IS already registered", () => {
    registry.register(buildDefinition({ identifier: "dependency_indicator" }));
    expect(() => validator.validate(buildDefinition({ identifier: "dependent_indicator", dependencies: ["dependency_indicator"] }), registry)).not.toThrow();
  });
});
