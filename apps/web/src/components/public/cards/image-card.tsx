import { Card, CardContent } from "@rmsm/ui";
import { cn } from "@/lib/utils";

interface ImageCardProps {
  src: string;
  alt: string;
  title: string;
  description?: string;
  className?: string;
}

export function ImageCard({ src, alt, title, description, className }: ImageCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- config-driven marketing image; next/image remote-pattern config out of scope for this shell milestone. */}
      <img src={src} alt={alt} className="aspect-video w-full object-cover" />
      <CardContent className="pt-6">
        <h3 className="font-semibold">{title}</h3>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </CardContent>
    </Card>
  );
}
