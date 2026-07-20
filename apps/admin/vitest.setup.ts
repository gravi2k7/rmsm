import "@testing-library/jest-dom/vitest";

// Radix UI primitives (Dialog, Sheet, Select, Tooltip, DropdownMenu) call
// these DOM APIs, which jsdom doesn't implement. Real, minimal polyfills —
// not mocks of application behavior.
if (typeof window !== "undefined") {
  if (!window.ResizeObserver) {
    window.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {};
  }
}
