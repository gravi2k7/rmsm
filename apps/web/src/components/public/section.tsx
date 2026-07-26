import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Section({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={cn("py-12 md:py-16", className)} {...props} />;
}
