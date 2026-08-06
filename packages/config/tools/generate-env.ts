import { extractMetadata } from "./analyzer";
import { writeEnvExample } from "./writers/env-writer";
import { writeEnvironmentManifest } from "./writers/markdown-writer";
import { writeConfigurationAudit } from "./writers/audit-writer";

function main(): void {
  console.log("=================================");
  console.log(" RMSM Environment Generator");
  console.log("=================================");
  console.log();

  const metadata = extractMetadata();

  console.log(`Discovered ${metadata.length} environment variables.`);
  console.log();

  const envFile = writeEnvExample(metadata);
  console.log(`Generated ${envFile}`);

  const manifestFile = writeEnvironmentManifest(metadata);
  console.log(`Generated ${manifestFile}`);

  const auditFile = writeConfigurationAudit(metadata);

  console.log(`Generated ${auditFile}`);

}

main();