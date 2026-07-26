import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import PricingPage, { metadata } from "../page";

describe("PricingPage (WM-008R)", () => {
  it("renders the hero headline and Start Free Trial / Request Demo CTAs, plus per-plan Talk to Sales CTAs", () => {
    render(<PricingPage />);
    expect(screen.getByRole("heading", { level: 1, name: /^enterprise pricing$/i })).toBeInTheDocument();
    // WM-020A — hero's primary CTA now drives self-serve signup; the
    // secondary "Request Demo" CTA and every per-plan "Talk to Sales"
    // button are unchanged.
    expect(screen.getByRole("link", { name: /start free trial/i })).toHaveAttribute("href", "/signup");
    expect(screen.getAllByRole("link", { name: /talk to sales/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /request demo/i }).length).toBeGreaterThan(0);
  });

  it("renders every WM-008R section without inventing real pricing", () => {
    render(<PricingPage />);
    expect(screen.getByText("Pricing built for how enterprises actually buy software")).toBeInTheDocument();
    expect(screen.getByText("Plans for every stage")).toBeInTheDocument();
    expect(screen.getAllByText("Professional").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Contact Sales").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Custom").length).toBeGreaterThan(0);
    expect(screen.getByText("Compare plan capabilities")).toBeInTheDocument();
    expect(screen.getByText(/illustrative and subject to change/i)).toBeInTheDocument();
    expect(screen.getByText("Licensing models built for enterprise procurement")).toBeInTheDocument();
    expect(screen.getByText("Deploy the way your organization requires")).toBeInTheDocument();
    expect(screen.getByText("Optional services to support your deployment")).toBeInTheDocument();
    expect(screen.getByText("How is pricing determined?")).toBeInTheDocument();
    expect(screen.getByText("Talk to our sales team")).toBeInTheDocument();
  });

  it("has page-specific SEO metadata distinct from other pages", () => {
    expect(metadata.title).toBe("Pricing | RMSM");
    expect(metadata.alternates?.canonical).toBe("http://localhost:3000/pricing");
  });
});
