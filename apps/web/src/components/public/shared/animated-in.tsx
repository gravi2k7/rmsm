"use client";

import { useEffect, useRef, useState, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type AnimationVariant = "fade" | "slide-up" | "slide-left" | "slide-right" | "scale";

interface AnimatedInProps extends HTMLAttributes<HTMLDivElement> {
  variant?: AnimationVariant;
  /** Milliseconds to delay after entering the viewport, for staggering a
   * group of siblings (e.g. a grid of cards). */
  delayMs?: number;
  children: ReactNode;
}

const VARIANT_HIDDEN: Record<AnimationVariant, string> = {
  fade: "opacity-0",
  "slide-up": "opacity-0 translate-y-4",
  "slide-left": "opacity-0 translate-x-4",
  "slide-right": "opacity-0 -translate-x-4",
  scale: "opacity-0 scale-95",
};

const VARIANT_VISIBLE: Record<AnimationVariant, string> = {
  fade: "opacity-100",
  "slide-up": "opacity-100 translate-y-0",
  "slide-left": "opacity-100 translate-x-0",
  "slide-right": "opacity-100 translate-x-0",
  scale: "opacity-100 scale-100",
};

/**
 * Lightweight CSS/Tailwind-only entrance animation (Section 17 — no
 * animation library is installed anywhere in the workspace, so this uses a
 * plain `IntersectionObserver` + Tailwind transition classes, nothing more).
 * Every marketing section component in this design system composes this
 * rather than each reimplementing its own scroll-in effect. Fully inert
 * under `prefers-reduced-motion` via the `motion-reduce:` variant and the
 * global reduced-motion rule in `globals.css`.
 */
export function AnimatedIn({ variant = "fade", delayMs = 0, className, children, ...props }: AnimatedInProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
      className={cn(
        "transition-all duration-700 ease-out motion-reduce:transition-none motion-reduce:transform-none",
        visible ? VARIANT_VISIBLE[variant] : VARIANT_HIDDEN[variant],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
