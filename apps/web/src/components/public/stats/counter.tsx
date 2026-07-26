"use client";

import { useEffect, useRef, useState } from "react";

interface CounterProps {
  value: number;
  suffix?: string;
  prefix?: string;
  durationMs?: number;
  className?: string;
}

/**
 * Animated count-up (Section 4). Starts counting only once scrolled into
 * view (`IntersectionObserver`, matching `AnimatedIn`'s approach rather
 * than a second observer implementation pattern) and respects
 * `prefers-reduced-motion` by jumping straight to the final value instead
 * of animating — per Section 20's "reduced motion" requirement, not just
 * Section 17's general animation rule.
 *
 * The animation's elapsed time is measured entirely from
 * `requestAnimationFrame`'s own timestamp argument — the reference point is
 * captured from the *first* rAF callback, not from a separate
 * `performance.now()` call made outside of it. Those two clocks are not
 * guaranteed to share an origin (jsdom's `requestAnimationFrame`, in
 * particular, does not use the same epoch as `performance.now()`), and
 * diffing timestamps from two different clocks can go arbitrarily negative
 * or arbitrarily large depending on environment — which is exactly what
 * produced garbled/negative displayed values previously. Progress is also
 * explicitly clamped to [0, 1] on both ends as a second line of defense.
 */
export function Counter({ value, suffix = "", prefix = "", durationMs = 1200, className }: CounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let rafId: number | null = null;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();

        if (prefersReducedMotion) {
          setDisplay(value);
          return;
        }

        let startTimestamp: number | null = null;

        function tick(timestamp: number) {
          if (startTimestamp === null) startTimestamp = timestamp;

          const elapsed = timestamp - startTimestamp;
          const progress = Math.min(1, Math.max(0, durationMs === 0 ? 1 : elapsed / durationMs));

          setDisplay(Math.round(value * progress));

          if (progress < 1) {
            rafId = requestAnimationFrame(tick);
          } else {
            rafId = null;
          }
        }

        rafId = requestAnimationFrame(tick);
      },
      { threshold: 0.5 },
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [value, durationMs]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display.toLocaleString()}
      {suffix}
    </span>
  );
}