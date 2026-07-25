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

// Pointer Capture (Radix UI)
HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
HTMLElement.prototype.setPointerCapture = vi.fn();
HTMLElement.prototype.releasePointerCapture = vi.fn();
// scrollIntoView (Radix UI)
HTMLElement.prototype.scrollIntoView = vi.fn();