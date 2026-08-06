import fs from "node:fs";
import path from "node:path";

import type { EnvVariableMetadata } from "../types";
import { formatVariable } from "../utils/formatter";

const GROUPS: Record<string, string[]> = {
  APPLICATION: [
    "NODE_ENV",
    "APP_ENV",
    "API_PORT",
    "WEB_PORT",
    "ADMIN_PORT",
    "WEB_APP_URL",
    "CORS_ALLOWED_ORIGINS",
    "FEATURE_FLAGS",
  ],

  DATABASE: [
    "DATABASE_URL",
    "REDIS_URL",
  ],

  AUTHENTICATION: [
    "JWT_ACCESS_SECRET",
    "JWT_REFRESH_SECRET",
    "JWT_ACCESS_TTL",
    "JWT_REFRESH_TTL",
    "COOKIE_SECRET",
    "TWO_FACTOR_ENCRYPTION_KEY",
    "TWO_FACTOR_ISSUER",
  ],

  AI: [
    "AI_SERVICE_URL",
    "AI_SERVICE_API_KEY",
    "OPENAI_API_KEY",
    "OLLAMA_BASE_URL",
    "OPENAI_BASE_URL",
  ],
};

function writeSection(
  lines: string[],
  title: string,
  variables: EnvVariableMetadata[],
): void {
  if (variables.length === 0) {
    return;
  }

  lines.push("# ==============================================================================");
  lines.push(`# ${title}`);
  lines.push("# ==============================================================================");
  lines.push("");

  for (const variable of variables) {
    lines.push(formatVariable(variable));
  }

  lines.push("");
}

export function writeEnvExample(
  metadata: EnvVariableMetadata[],
): string {

  const lines: string[] = [];

  lines.push("# ==============================================================================");
  lines.push("# RMSM Enterprise Platform");
  lines.push("# Production Environment Configuration");
  lines.push("#");
  lines.push("# AUTO-GENERATED FILE");
  lines.push("# DO NOT EDIT MANUALLY");
  lines.push("# ==============================================================================");
  lines.push("");

  const remaining = [...metadata];

  for (const [groupName, keys] of Object.entries(GROUPS)) {
    const section = remaining.filter((item) => keys.includes(item.name));

    writeSection(lines, groupName, section);

    for (const item of section) {
      const index = remaining.findIndex((x) => x.name === item.name);

      if (index >= 0) {
        remaining.splice(index, 1);
      }
    }
  }

  writeSection(lines, "OTHER", remaining);

  const output = path.resolve(
    process.cwd(),
    "../../.env.example.generated",
  );

  fs.writeFileSync(output, lines.join("\n"), "utf8");

  return output;
}