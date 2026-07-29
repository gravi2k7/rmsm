import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { act } from "@testing-library/react";

// ResizeObserver
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver =
  ResizeObserverMock as unknown as typeof ResizeObserver;

// IntersectionObserver
//
// jsdom does not implement this API at all. It's used by
// `components/public/shared/animated-in.tsx` (scroll-in animation wrapper,
// used across every marketing page) and
// `components/public/stats/counter.tsx` (animated stat counters), both via
// `new IntersectionObserver(...)` inside a `useEffect`. Without this mock,
// mounting any component that (directly or via a child) uses either of
// those throws `ReferenceError: IntersectionObserver is not defined` from
// inside React's passive-effect flush.
class IntersectionObserverMock {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = "";
  readonly thresholds: ReadonlyArray<number> = [];

  constructor(private readonly callback: IntersectionObserverCallback) {}

  // Immediately (async, mirroring the real API's own async delivery)
  // report the observed element as intersecting. Both `AnimatedIn` and
  // `Counter` gate their effect (a fade-in / a count-up animation) behind
  // `entry.isIntersecting` -- a no-op `observe()` would leave every such
  // component permanently in its pre-visible state (opacity 0 / stuck at
  // 0), since jsdom has no layout engine that could ever produce a real
  // intersection event. Reporting "always visible" is the standard test
  // double for this API and matches what these components see the moment
  // they're scrolled into view in a real browser.
  observe(target: Element) {
    // Wrapped in act() -- same reasoning as notifyManager in
    // render-with-query.tsx: this fires asynchronously (a queued
    // microtask, not inside whatever act() scope `render()` itself used),
    // so the setVisible/setDisplay state update it triggers inside
    // AnimatedIn/Counter needs its own act() wrapping to avoid an "update
    // ... was not wrapped in act(...)" warning.
    queueMicrotask(() => {
      act(() => {
        this.callback(
          [
            {
              isIntersecting: true,
              target,
              intersectionRatio: 1,
              boundingClientRect: target.getBoundingClientRect(),
              intersectionRect: target.getBoundingClientRect(),
              rootBounds: null,
              time: Date.now(),
            } as IntersectionObserverEntry,
          ],
          this as unknown as IntersectionObserver,
        );
      });
    });
  }
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

global.IntersectionObserver =
  IntersectionObserverMock as unknown as typeof IntersectionObserver;

// matchMedia
//
// jsdom does not implement this API either. `components/public/stats/counter.tsx`
// calls `window.matchMedia("(prefers-reduced-motion: reduce)").matches`
// synchronously in a `useEffect`, before it ever touches
// IntersectionObserver, so without this mock every Counter render throws
// `TypeError: window.matchMedia is not a function`. Defaults to
// `matches: false` (i.e. "no reduced-motion preference"), which is the
// common jsdom-polyfill convention and matches what a real browser reports
// when the OS has no such setting configured.
window.matchMedia =
  window.matchMedia ||
  vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));

// Pointer Capture (Radix UI)
HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
HTMLElement.prototype.setPointerCapture = vi.fn();
HTMLElement.prototype.releasePointerCapture = vi.fn();
// scrollIntoView (Radix UI)
HTMLElement.prototype.scrollIntoView = vi.fn();

// Flush pending real macrotasks after every test, globally.
//
// Several things in this suite schedule work via a real `setTimeout(fn, 0)`
// that a test doesn't (and often can't, from application code) explicitly
// await:
//   - jsdom's own <a> click handling unconditionally schedules a
//     `setTimeout` that tries to follow the link's href, regardless of
//     whether a handler (e.g. next/link's `Link`) called
//     `preventDefault()` -- see jsdom's
//     HTMLHyperlinkElementUtils-impl.js#_followAHyperlink.
//   - React Query's notifyManager schedules query/mutation state-change
//     notifications the same way (see @tanstack/query-core's
//     notifyManager.ts).
//   - The IntersectionObserver mock above queues its callback via
//     `queueMicrotask`.
//
// Vitest's default `isolate: true` resets each test FILE's module
// registry, but not the underlying Node event loop/timer queue of the
// forked worker process when that worker is reused across files in the
// same run. So a timer left pending by one test can fire during a LATER
// test in a different file, landing mid-sequence in something like a
// `userEvent.type()` call and corrupting or dropping keystrokes.
//
// This was originally two chained `setTimeout(resolve, 0)` ticks, on the
// assumption that a "0ms" timer resolves within a tick or two of real
// time. That held in a fast/idle environment but proved insufficient on a
// heavily-loaded machine (observed multi-second "environment"/"setup"
// phase durations per test file) -- under enough contention, a pending
// 0ms timer (or a multi-hop chain of them: fetch resolves -> notifyManager
// schedules a notify -> that notify's re-render schedules another) can
// take longer than two same-tick flushes to actually fire, so it still
// lands in the next test. A single real wall-clock wait is more robust
// here than counting ticks: it gives the event loop an actual time
// window to drain whatever's pending, regardless of chain depth or how
// busy the machine is, at the cost of a fixed per-test delay.
afterEach(async () => {
  await new Promise((resolve) => setTimeout(resolve, 50));
});
