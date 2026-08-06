import dotenv from "dotenv";
import path from "node:path";

import { extractMetadata } from "./analyzer";
import { RequiredValidator } from "./validators/required";

// Load the project's root .env file
dotenv.config({
  path: path.resolve(process.cwd(), "../../.env"),
});

function main(): void {
  console.log("=================================");
  console.log(" RMSM Environment Validator");
  console.log("=================================");
  console.log();

  console.log(
    `Loaded environment: ${path.resolve(process.cwd(), "../../.env")}`,
  );
  console.log();

  const metadata = extractMetadata();

  console.log(`Loaded ${metadata.length} environment variables from schema.`);
  console.log();

  const validator = new RequiredValidator();

  const result = validator.validate(
    metadata,
    process.env as Record<string, string | undefined>,
  );

  if (result.errors.length === 0) {
    console.log("✓ Validation passed.");
    return;
  }

  console.error("Validation failed.");
  console.error();

  for (const error of result.errors) {
    console.error(`✗ ${error.variable}: ${error.message}`);
  }

  console.error();
  console.error(`Errors: ${result.errors.length}`);

  process.exit(1);
}

main();