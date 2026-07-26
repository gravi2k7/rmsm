import { cn } from "@/lib/utils";

interface SectionIntroProps {
  text: string;
  align?: "left" | "center";
  className?: string;
}

/** A single, larger lede paragraph — distinct from `SectionHeader`'s
 * `description` (shorter, always paired with a title) for pages that want a
 * standalone intro block between the hero and the first content section. */
export function SectionIntro({ text, align = "center", className }: SectionIntroProps) {
  return (
    <p className={cn("max-w-3xl text-lg text-muted-foreground", align === "center" ? "mx-auto text-center" : "text-left", className)}>
      {text}
    </p>
  );
}
