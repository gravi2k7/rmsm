/** Root ESLint config. Each app/package extends this. */
module.exports = {
  root: true,
  env: { node: true, es2022: true },
  parser: "@typescript-eslint/parser",
  parserOptions: { ecmaVersion: 2022, sourceType: "module", project: false },
  plugins: ["@typescript-eslint", "import"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier",
  ],
  rules: {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "no-console": ["warn", { allow: ["warn", "error"] }],
    "import/no-cycle": "error",
    "import/no-default-export": "off"
  },
  ignorePatterns: ["dist", ".next", "coverage", "node_modules", "*.config.js", "*.config.ts"],
};
