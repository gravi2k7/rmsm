import type { ReactNode } from "react";
import { Container } from "./container";

interface HeroProps {
  title: string;
  description?: string;
  children?: ReactNode;
}

/** Placeholder only (Task 7) — no final marketing copy, imagery, or
 * animation. Later milestones own real hero content. */
export function Hero({ title, description, children }: HeroProps) {
  return (
    <Container className="py-16 text-center">
      <h1 className="text-3xl font-semibold">{title}</h1>
      {description ? <p className="mt-2 text-muted-foreground">{description}</p> : null}
      {children}
    </Container>
  );
}
