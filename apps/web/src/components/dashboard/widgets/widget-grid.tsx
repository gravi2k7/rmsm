import type { ReactNode } from "react";
import { cn } from "@rmsm/ui";

/**
 * UD-001.1 Phase 3 — Responsive Widget Grid.
 *
 * Replaces the repeated `grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4`
 * (and the 3-column variant) that `app/(app)/dashboard/page.tsx` previously
 * wrote inline, four separate times, with one reusable primitive. Individual
 * widgets opt into spanning more than one cell via `StatCard`/`WidgetCard`'s
 * new `className` prop (e.g. `"sm:col-span-2"`) — the grid itself stays a
 * plain CSS grid, no drag-reorder or persisted layout (out of this phase's
 * scope; `@dnd-kit` is already a workspace dependency if a future phase adds
 * that).
 */
export function WidgetGrid({ children, className, columns = 4 }: { children: ReactNode; className?: string; columns?: 3 | 4 }) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2",
        columns === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3",
        className,
      )}
    >
      {children}
    </div>
  );
}
