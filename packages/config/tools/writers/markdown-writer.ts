import fs from "node:fs";
import path from "node:path";

import type { EnvVariableMetadata } from "../types";

export function writeEnvironmentManifest(
  metadata: EnvVariableMetadata[],
): string {

  const lines: string[] = [];

  lines.push("# RMSM Environment Manifest");
  lines.push("");
  lines.push("Auto-generated.");
  lines.push("");

  lines.push("| Variable | Type | Required | Default |");
  lines.push("|----------|------|----------|---------|");

  for (const item of metadata) {
    lines.push(
      `| ${item.name} | ${item.type} | ${
        item.required ? "Yes" : "No"
      } | ${item.defaultValue ?? ""} |`,
    );
  }

  const output = path.resolve(
    process.cwd(),
    "../../docs/architecture/environment-manifest.md",
  );

  fs.writeFileSync(output, lines.join("\n"), "utf8");

  return output;
}