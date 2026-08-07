import {
  ZodBoolean,
  ZodDefault,
  ZodEffects,
  ZodEnum,
  ZodNumber,
  ZodObject,
  ZodOptional,
  ZodString,
  ZodTypeAny,
} from "zod";

import { envSchema } from "../src/env/env.validator";
import type { EnvVariableMetadata } from "./types";

/**
 * Unwraps leading `ZodEffects` layers (e.g. `.refine()`/`.superRefine()`),
 * leaving any `ZodDefault`/`ZodOptional` wrapper intact. Shared by every
 * helper below that only needs to see past effects, not past defaults or
 * optionality.
 */
function unwrapEffects(schema: ZodTypeAny): ZodTypeAny {
  let current = schema;

  while (current instanceof ZodEffects) {
    current = current.innerType();
  }

  return current;
}

/**
 * Removes wrapper types so we can inspect the underlying schema.
 */
function unwrapSchema(schema: ZodTypeAny): ZodTypeAny {
  let current = schema;

  for (;;) {
    if (current instanceof ZodEffects) {
      current = current.innerType();
      continue;
    }

    if (current instanceof ZodDefault) {
      current = current.removeDefault();
      continue;
    }

    if (current instanceof ZodOptional) {
      current = current.unwrap();
      continue;
    }

    break;
  }

  return current;
}

/**
 * Determines the primitive type.
 */
function detectType(schema: ZodTypeAny): string {
  const unwrapped = unwrapSchema(schema);

  if (unwrapped instanceof ZodString) {
    return "string";
  }

  if (unwrapped instanceof ZodNumber) {
    return "number";
  }

  if (unwrapped instanceof ZodBoolean) {
    return "boolean";
  }

  if (unwrapped instanceof ZodEnum) {
    return "enum";
  }

  if (unwrapped instanceof ZodObject) {
    return "object";
  }

  return unwrapped._def.typeName;
}

/**
 * Returns true if the schema has a default value.
 */
function hasDefault(schema: ZodTypeAny): boolean {
  return unwrapEffects(schema) instanceof ZodDefault;
}

/**
 * Returns true if the schema is optional.
 */
function isOptional(schema: ZodTypeAny): boolean {
  return unwrapEffects(schema) instanceof ZodOptional;
}

/**
 * Extracts the runtime default value.
 */
function getDefaultValue(schema: ZodTypeAny): unknown {
  const current = unwrapEffects(schema);

  if (current instanceof ZodDefault) {
    return current._def.defaultValue();
  }

  return undefined;
}

/**
 * Extract metadata from the RMSM environment schema.
 */
export function extractMetadata(): EnvVariableMetadata[] {
  const rootSchema = unwrapEffects(envSchema);

  if (!(rootSchema instanceof ZodObject)) {
    throw new Error("Unexpected schema type.");
  }

  return Object.entries(rootSchema.shape)
    .map(([name, schema]) => {
      const required =
        !isOptional(schema) &&
        !hasDefault(schema);

      return {
        name,
        type: detectType(schema),
        required,
        defaultValue: getDefaultValue(schema),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}