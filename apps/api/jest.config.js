/** Unit test config. E2E uses test/jest-e2e.json separately. */
module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: "src",
  testRegex: ".spec.ts$",
  transform: { "^.+\\.ts$": "ts-jest" },
  collectCoverageFrom: ["**/*.(t|j)s"],
  coverageDirectory: "../coverage",
  testEnvironment: "node",
};
