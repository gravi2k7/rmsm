import { Timeline } from "./timeline";
import type { TimelineItemData } from "./types";

interface RoadmapProps {
  items: TimelineItemData[];
  className?: string;
}

/** Roadmap preset — horizontal by default (a roadmap reads left-to-right as
 * "now → later"), collapsing to vertical on small screens via `Timeline`
 * itself. */
export function Roadmap({ items, className }: RoadmapProps) {
  return <Timeline items={items} orientation="horizontal" className={className} />;
}
