import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Generic public-page wrapper — vertical rhythm only, no content
 * (Task 7: "minimal implementation, no styling work"). */
export function PageShell({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex min-h-[60vh] flex-col", className)} {...props} />;
}
