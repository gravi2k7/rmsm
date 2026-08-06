import { z } from "zod";
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

function unwrapSchema(schema: ZodTypeAny): ZodTypeAny {
  let current = schema;

  while (true) {
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

export function extractMetadata(): EnvVariableMetadata[] {
  const rootSchema =
    envSchema instanceof ZodEffects
      ? envSchema.innerType()
      : envSchema;

  if (!(rootSchema instanceof ZodObject)) {
    throw new Error("Unexpected schema type.");
  }

  return Object.entries(rootSchema.shape)
    .map(([name, schema]) => {
      const required =
        !(schema instanceof ZodOptional) &&
        !(schema instanceof ZodDefault);

      const defaultValue =
        schema instanceof ZodDefault
          ? schema._def.defaultValue()
          : undefined;

      return {
        name,
        type: detectType(schema),
        required,
        defaultValue,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}