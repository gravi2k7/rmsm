import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconWrapper } from "@/components/public/icons";

interface ComingSoonProps {
  title?: string;
  description?: string;
  className?: string;
}

/** Marketing-flavored "coming soon" block — distinct from
 * `route-placeholder.tsx` (which is a whole-page placeholder for an
 * unbuilt route) in that this is meant to sit inside an otherwise-real page,
 * e.g. a "Roadmap" section with one upcoming, unannounced item. */
export function ComingSoon({ title = "Coming soon", description, className }: ComingSoonProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-12 text-center", className)}>
      <IconWrapper icon={Sparkles} variant="muted" size="md" />
      <h3 className="text-base font-semibold">{title}</h3>
      {description ? <p className="max-w-sm text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
}
