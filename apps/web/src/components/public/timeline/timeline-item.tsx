import { cn } from "@/lib/utils";
import type { TimelineItemData } from "./types";

interface TimelineItemProps extends TimelineItemData {
  orientation: "vertical" | "horizontal";
  isLast: boolean;
}

const STATUS_DOT: Record<NonNullable<TimelineItemData["status"]>, string> = {
  done: "bg-primary border-primary",
  active: "border-primary bg-background ring-4 ring-primary/20",
  upcoming: "border-border bg-background",
};

export function TimelineItem({ title, description, date, status = "upcoming", orientation, isLast }: TimelineItemProps) {
  if (orientation === "horizontal") {
    return (
      <li className="relative flex min-w-[12rem] flex-1 flex-col gap-2">
        <div className="flex items-center">
          <span className={cn("h-3 w-3 shrink-0 rounded-full border-2", STATUS_DOT[status])} aria-hidden="true" />
          {!isLast ? <span className="h-0.5 flex-1 bg-border" aria-hidden="true" /> : null}
        </div>
        {date ? <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{date}</p> : null}
        <p className="text-sm font-semibold">{title}</p>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </li>
    );
  }

  return (
    <li className="relative flex gap-4 pb-8 last:pb-0">
      <div className="flex flex-col items-center">
        <span className={cn("h-3 w-3 shrink-0 rounded-full border-2", STATUS_DOT[status])} aria-hidden="true" />
        {!isLast ? <span className="w-0.5 flex-1 bg-border" aria-hidden="true" /> : null}
      </div>
      <div className="flex-1">
        {date ? <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{date}</p> : null}
        <p className="text-sm font-semibold">{title}</p>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
    </li>
  );
}
