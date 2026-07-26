import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { HeroCentered } from "../hero-centered";

describe("HeroCentered", () => {
  it("renders title, subtitle, description, and both CTAs", () => {
    render(
      <HeroCentered
        title="Trade smarter"
        subtitle="AI-driven execution"
        description="Institutional-grade tooling."
        primaryCta={{ label: "Get started", href: "/register" }}
        secondaryCta={{ label: "Talk to sales", href: "/contact" }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Trade smarter", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("AI-driven execution")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Get started" })).toHaveAttribute("href", "/register");
    expect(screen.getByRole("link", { name: "Talk to sales" })).toHaveAttribute("href", "/contact");
  });

  it("renders a badge when provided", () => {
    render(<HeroCentered title="Trade smarter" badge="New" />);
    expect(screen.getByText("New")).toBeInTheDocument();
  });
});
