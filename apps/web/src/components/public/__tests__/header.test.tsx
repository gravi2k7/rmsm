import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Header } from "../header";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

describe("Header", () => {
  it("renders the logo, mega menu sections, login, and CTA", () => {
    render(<Header />);

    expect(screen.getByText("RMSM")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Platform" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "AI" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Markets" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resources" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Company" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Login" })).toHaveAttribute("href", "/login");
    // WM-015R: "/register" never existed as a route (Part 13 broken-link
    // fix) — ctaConfig.primary.href pointed at /contact.
    // WM-020A: primary CTA now drives self-serve signup instead of a sales
    // conversation.
    expect(screen.getByRole("link", { name: "Start Free Trial" })).toHaveAttribute("href", "/signup");
  });

  it("renders a mobile menu trigger", () => {
    render(<Header />);
    expect(screen.getByRole("button", { name: "Open menu" })).toBeInTheDocument();
  });
});
