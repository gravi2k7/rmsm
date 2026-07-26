import { cn } from "@/lib/utils";

export interface LogoItem {
  name: string;
  src?: string;
  href?: string;
}

interface LogoCloudProps {
  title?: string;
  logos: LogoItem[];
  /** "grid" is a static, responsive wrap. "marquee" is a CSS-only
   * (Tailwind `animate-marquee`, see `tailwind.config.ts`) infinite scroll
   * — the "carousel placeholder" Section 5 asks for, without a carousel
   * library or JS interval. Paused on hover and fully static under
   * `prefers-reduced-motion` (global rule in `globals.css` zeroes the
   * animation duration). */
  variant?: "grid" | "marquee";
  className?: string;
}

function LogoMark({ logo }: { logo: LogoItem }) {
  const content = logo.src ? (
    // eslint-disable-next-line @next/next/no-img-element -- partner/customer logos are arbitrary config-driven assets; not worth next/image remote-pattern config in this shell milestone.
    <img src={logo.src} alt={logo.name} className="h-8 w-auto grayscale opacity-70 transition-opacity hover:opacity-100" />
  ) : (
    <span className="text-sm font-semibold text-muted-foreground">{logo.name}</span>
  );

  if (logo.href) {
    return (
      <a href={logo.href} target="_blank" rel="noreferrer noopener" aria-label={logo.name} className="flex shrink-0 items-center px-6">
        {content}
      </a>
    );
  }

  return (
    <span aria-label={logo.name} className="flex shrink-0 items-center px-6">
      {content}
    </span>
  );
}

/** Enterprise logo cloud (Section 5) — same component serves "partners,"
 * "customers," and "integrations" use cases; the caller's `title` and
 * `logos` list is what differentiates them, not separate components. */
export function LogoCloud({ title, logos, variant = "grid", className }: LogoCloudProps) {
  if (logos.length === 0) return null;

  return (
    <div className={cn("flex flex-col items-center gap-6", className)}>
      {title ? <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">{title}</p> : null}

      {variant === "grid" ? (
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-6">
          {logos.map((logo) => (
            <LogoMark key={logo.name} logo={logo} />
          ))}
        </div>
      ) : (
        <div className="group w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
          <div className="flex w-max animate-marquee items-center group-hover:[animation-play-state:paused] motion-reduce:animate-none">
            {[...logos, ...logos].map((logo, i) => (
              <LogoMark key={`${logo.name}-${i}`} logo={logo} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
