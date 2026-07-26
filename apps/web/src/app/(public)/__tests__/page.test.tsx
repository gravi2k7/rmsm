import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import HomePage, { metadata } from "../page";

describe("HomePage (WM-004R)", () => {
  it("renders the hero headline and Start Free Trial / Explore Platform CTAs", () => {
    render(<HomePage />);
    expect(
      screen.getByRole("heading", { level: 1, name: /enterprise ai trading intelligence, unified for the modern desk/i }),
    ).toBeInTheDocument();
    // WM-020A — hero's primary CTA now drives self-serve signup; the
    // closing CTABanner further down the page still says "Request Demo",
    // which is covered by the section-rendering test below.
    expect(screen.getByRole("link", { name: /start free trial/i })).toHaveAttribute("href", "/signup");
    expect(screen.getAllByRole("link", { name: /explore platform/i }).length).toBeGreaterThan(0);
  });

  it("renders every WM-004R section", () => {
    render(<HomePage />);
    expect(screen.getByText("Trusted by leading trading desks worldwide")).toBeInTheDocument();
    expect(screen.getByText("Everything your desk needs, in one platform")).toBeInTheDocument();
    expect(screen.getByText("AI Platform")).toBeInTheDocument();
    expect(screen.getByText("Built for how enterprise trading desks actually work")).toBeInTheDocument();
    expect(screen.getByText("A single platform instead of a patchwork of tools")).toBeInTheDocument();
    expect(screen.getByText("Four layers, one platform")).toBeInTheDocument();
    expect(screen.getByText("The business value of a unified trading platform")).toBeInTheDocument();
    expect(screen.getByText("What trading desks say about RMSM")).toBeInTheDocument();
    expect(screen.getByText("Bring enterprise AI trading intelligence to your desk")).toBeInTheDocument();
  });

  it("has SEO metadata pointing at the homepage", () => {
    expect(metadata.title).toBe("RMSM AI");
    expect(metadata.alternates?.canonical).toBe("http://localhost:3000/");
  });
});
