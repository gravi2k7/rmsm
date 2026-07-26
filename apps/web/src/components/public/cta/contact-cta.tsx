import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Button } from "@rmsm/ui";
import { cn } from "@/lib/utils";
import { IconWrapper } from "@/components/public/icons";

interface ContactCTAProps {
  title: string;
  description?: string;
  cta: { label: string; href: string };
  className?: string;
}

/** "Talk to us" panel — visually distinct (icon-led, boxed) from
 * `CTACard` so a page can use both a generic card CTA and a
 * contact-specific one without them looking identical. */
export function ContactCTA({ title, description, cta, className }: ContactCTAProps) {
  return (
    <div className={cn("flex flex-col items-center gap-4 rounded-xl border border-dashed border-border p-8 text-center", className)}>
      <IconWrapper icon={MessageCircle} variant="muted" size="lg" />
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        {description ? <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <Button asChild>
        <Link href={cta.href}>{cta.label}</Link>
      </Button>
    </div>
  );
}
