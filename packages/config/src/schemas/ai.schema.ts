import { z } from "zod";
import { port } from "../env/env.parser";

/** The platform's own AI service (indicator/analysis inference), not to be
 * confused with a specific vendor — `OPENAI_API_KEY` is one possible
 * backing provider among others this schema leaves room for. Unchanged
 * from the original flat `envSchema`. */
export const aiSchema = z.object({
  AI_SERVICE_URL: z.string().url().default("http://localhost:8000"),
  AI_SERVICE_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  AI_PORT: port(8000),
});

export type AiEnv = z.infer<typeof aiSchema>;
