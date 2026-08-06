import fs from "node:fs";
import path from "node:path";

import type { EnvVariableMetadata } from "../types";

export function writeConfigurationAudit(
  metadata: EnvVariableMetadata[],
): string {
  const required = metadata.filter((v) => v.required);
  const optional = metadata.filter((v) => !v.required);
  const defaults = metadata.filter(
    (v) => v.defaultValue !== undefined,
  );

  const lines: string[] = [];

  lines.push("# RMSM Configuration Audit");
  lines.push("");
  lines.push("Auto-generated.");
  lines.push("");

  lines.push("## Summary");
  lines.push("");
  lines.push(`- Total Variables: ${metadata.length}`);
  lines.push(`- Required Variables: ${required.length}`);
  lines.push(`- Optional Variables: ${optional.length}`);
  lines.push(`- Variables with Defaults: ${defaults.length}`);
  lines.push(
    `- Variables without Defaults: ${metadata.length - defaults.length}`,
  );
  lines.push("");

  lines.push("## Required Variables");
  lines.push("");

  for (const item of required) {
    lines.push(`- ${item.name}`);
  }

  const output = path.resolve(
    process.cwd(),
    "../../docs/deployment/configuration-audit.md",
  );

  fs.writeFileSync(output, lines.join("\n"), "utf8");

  return output;
}