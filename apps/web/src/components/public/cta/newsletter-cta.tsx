import { cn } from "@/lib/utils";

interface NewsletterCTAProps {
  title: string;
  description?: string;
  placeholder?: string;
  submitLabel?: string;
  className?: string;
}

/**
 * Standalone newsletter signup section — same placeholder-only pattern as
 * the footer's newsletter block (`components/public/footer.tsx`; no
 * submission handler exists yet in either), but as its own reusable
 * component for a page that wants it as a dedicated section rather than
 * only in the footer. Kept disabled rather than wired to a fake handler so
 * it can't be mistaken for working.
 */
export function NewsletterCTA({ title, description, placeholder = "you@company.com", submitLabel = "Subscribe", className }: NewsletterCTAProps) {
  return (
    <div className={cn("mx-auto flex max-w-lg flex-col items-center gap-4 text-center", className)}>
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <form className="flex w-full gap-2" aria-label={title}>
        <label htmlFor="newsletter-cta-email" className="sr-only">
          Email address
        </label>
        <input
          id="newsletter-cta-email"
          type="email"
          placeholder={placeholder}
          disabled
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-60"
        />
        <button type="submit" disabled className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
          {submitLabel}
        </button>
      </form>
    </div>
  );
}
