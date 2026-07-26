import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import MarketsPage, { metadata } from "../page";

describe("MarketsPage (WM-007R)", () => {
  it("renders the hero headline and Explore Markets / Request Enterprise Demo CTAs", () => {
    render(<MarketsPage />);
    expect(screen.getByRole("heading", { level: 1, name: /^enterprise markets$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /explore markets/i })).toHaveAttribute("href", "#markets");
    expect(screen.getAllByRole("link", { name: /request enterprise demo/i }).length).toBeGreaterThan(0);
  });

  it("renders every WM-007R section", () => {
    render(<MarketsPage />);
    expect(screen.getByText("Unified coverage across global markets")).toBeInTheDocument();
    expect(screen.getAllByText("Equities").length).toBeGreaterThan(0);
    expect(screen.getByText("Understand every market, continuously")).toBeInTheDocument();
    expect(screen.getByText("Market Monitoring")).toBeInTheDocument();
    expect(screen.getByText("Depth across every asset class")).toBeInTheDocument();
    expect(screen.getAllByText("Decision Support").length).toBeGreaterThan(0);
    expect(screen.getByText("One workflow, from research to reporting")).toBeInTheDocument();
    expect(screen.getByText("Analytics for every desk")).toBeInTheDocument();
    expect(screen.getByText("Performance Attribution")).toBeInTheDocument();
    expect(screen.getByText("From external data to portfolio decisions")).toBeInTheDocument();
    expect(screen.getByText("Risk visibility across every position")).toBeInTheDocument();
    expect(screen.getByText("Compliance Monitoring")).toBeInTheDocument();
    expect(screen.getByText("Built for global markets, by design")).toBeInTheDocument();
    expect(screen.getByText("Asia-Pacific")).toBeInTheDocument();
    expect(screen.getByText("Business outcomes, not just market data")).toBeInTheDocument();
    expect(screen.getByText("See enterprise market intelligence in action")).toBeInTheDocument();
  });

  it("has page-specific SEO metadata distinct from other pages", () => {
    expect(metadata.title).toBe("Markets | RMSM");
    expect(metadata.alternates?.canonical).toBe("http://localhost:3000/markets");
  });
});
