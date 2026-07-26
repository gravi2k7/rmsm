import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// ResizeObserver
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver =
  ResizeObserverMock as unknown as typeof ResizeObserver;

// IntersectionObserver (WM-003R: AnimatedIn / Counter scroll-reveal).
// Fires "intersecting" synchronously on observe() so components that only
// render/animate once visible behave deterministically in tests without
// needing to fake a real scroll.
class IntersectionObserverMock implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = "";
  readonly thresholds: ReadonlyArray<number> = [];
  constructor(private callback: IntersectionObserverCallback) {}
  observe(target: Element) {
    this.callback(
      [{ isIntersecting: true, target } as IntersectionObserverEntry],
      this,
    );
  }
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

global.IntersectionObserver =
  IntersectionObserverMock as unknown as typeof IntersectionObserver;

// matchMedia (WM-003R: Counter's prefers-reduced-motion check). jsdom has
// no real media query engine, so this always reports "not reduced motion"
// unless a test explicitly overrides it via `vi.stubGlobal`.
global.matchMedia =
  global.matchMedia ||
  vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
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