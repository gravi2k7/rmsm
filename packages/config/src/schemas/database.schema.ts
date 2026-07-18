import { z } from "zod";

/** Database connectivity. Unchanged from the original flat `envSchema` —
 * same validators, same field names, for full backward compatibility. */
export const databaseSchema = z.object({
  DATABASE_URL: z.string().url().or(z.string().startsWith("postgresql://")),
  REDIS_URL: z.string().startsWith("redis://"),
});

export type DatabaseEnv = z.infer<typeof databaseSchema>;
