import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Breadcrumbs } from "../breadcrumbs";

const pathname = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => pathname(),
}));

describe("Breadcrumbs", () => {
  it("renders nothing on the homepage", () => {
    pathname.mockReturnValue("/");
    const { container } = render(<Breadcrumbs />);
    expect(container).toBeEmptyDOMElement();
  });

  it("derives a labeled trail from config/navigation.ts for a known route", () => {
    pathname.mockReturnValue("/documentation");
    render(<Breadcrumbs />);
    expect(screen.getByText("Documentation")).toHaveAttribute("aria-current", "page");
  });

  it("falls back to a capitalized segment for an unknown route", () => {
    pathname.mockReturnValue("/legal/privacy");
    render(<Breadcrumbs />);
    expect(screen.getByText("Legal")).toBeInTheDocument();
    expect(screen.getByText("Privacy Policy")).toBeInTheDocument();
  });
});
