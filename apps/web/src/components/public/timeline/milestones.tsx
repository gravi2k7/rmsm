import { Timeline } from "./timeline";
import type { TimelineItemData } from "./types";

interface MilestonesProps {
  items: TimelineItemData[];
  className?: string;
}

/** Milestones preset — vertical by default (a changelog-style history
 * reads top-to-bottom). */
export function Milestones({ items, className }: MilestonesProps) {
  return <Timeline items={items} orientation="vertical" className={className} />;
}
