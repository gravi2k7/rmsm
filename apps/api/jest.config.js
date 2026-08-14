/** Unit test config. E2E uses test/jest-e2e.json separately. */
module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: "src",
  testRegex: ".spec.ts$",

  transform: {
    "^.+\\.ts$": "ts-jest",
  },

  moduleNameMapper: {
    "^@rmsm/database$": "<rootDir>/../../../packages/database/src/index.ts",
    "^@rmsm/database/(.*)$":
      "<rootDir>/../../../packages/database/src/$1",
    "^@rmsm/shared$":
      "<rootDir>/../../../packages/shared/src/index.ts",
    "^@rmsm/shared/(.*)$":
      "<rootDir>/../../../packages/shared/src/$1",
    "^@rmsm/core$":
      "<rootDir>/../../../packages/core/src/index.ts",
    "^@rmsm/core/(.*)$":
      "<rootDir>/../../../packages/core/src/$1",
  },

  collectCoverageFrom: ["**/*.(t|j)s"],
  coverageDirectory: "../coverage",
  testEnvironment: "node",
};