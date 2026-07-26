export type TimelineStatus = "done" | "active" | "upcoming";

export interface TimelineItemData {
  title: string;
  description?: string;
  date?: string;
  status?: TimelineStatus;
}
