import { cn } from "@/lib/utils";
import { TimelineItem } from "./timeline-item";
import type { TimelineItemData } from "./types";

interface TimelineProps {
  items: TimelineItemData[];
  /** Horizontal collapses to vertical below `lg` automatically — there is
   * no usable horizontal timeline on a phone-width viewport (Section 18:
   * responsive). */
  orientation?: "vertical" | "horizontal";
  className?: string;
}

export function Timeline({ items, orientation = "vertical", className }: TimelineProps) {
  const isHorizontal = orientation === "horizontal";

  return (
    <ol className={cn(isHorizontal ? "flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-4" : "flex flex-col", className)}>
      {items.map((item, i) => (
        <TimelineItem key={item.title} {...item} orientation={isHorizontal ? "horizontal" : "vertical"} isLast={i === items.length - 1} />
      ))}
    </ol>
  );
}
