import { z } from "zod";

/** Example schema proving Zod + React Hook Form wiring. No business fields. */
export const exampleFormSchema = z.object({
  email: z.string().email(),
});

export type ExampleFormValues = z.infer<typeof exampleFormSchema>;
