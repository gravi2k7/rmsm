import Link from "next/link";
import { Button } from "@rmsm/ui";

interface CtaProps {
  label: string;
  href: string;
}

/** Placeholder only (Task 7) — reuses the real, shared `@rmsm/ui` Button
 * rather than a bespoke marketing button. */
export function Cta({ label, href }: CtaProps) {
  return (
    <Button asChild>
      <Link href={href}>{label}</Link>
    </Button>
  );
}
