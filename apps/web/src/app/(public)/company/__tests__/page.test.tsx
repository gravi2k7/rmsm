import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import AboutPage, { metadata } from "../page";

describe("AboutPage (WM-009R)", () => {
  it("renders the hero headline and Request Demo / Talk to Sales CTAs", () => {
    render(<AboutPage />);
    expect(screen.getByRole("heading", { level: 1, name: /^about rmsm$/i })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /request demo/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /talk to sales/i })).toHaveAttribute("href", "/contact");
    expect(screen.getByRole("link", { name: /contact sales/i })).toHaveAttribute("href", "/contact");
  });

  it("renders every WM-009R section", () => {
    render(<AboutPage />);
    expect(screen.getByText("Building the next generation enterprise platform")).toBeInTheDocument();
    expect(screen.getByText("What we're working to achieve")).toBeInTheDocument();
    expect(screen.getByText("Core principles behind the platform")).toBeInTheDocument();
    expect(screen.getByText("Enterprise-First")).toBeInTheDocument();
    expect(screen.getByText("Engineering principles behind the platform")).toBeInTheDocument();
    expect(screen.getByText("Modular Architecture")).toBeInTheDocument();
    expect(screen.getByText("How the platform has evolved")).toBeInTheDocument();
    expect(screen.getByText("Foundation")).toBeInTheDocument();
    expect(screen.getByText("What sets the platform apart")).toBeInTheDocument();
    expect(screen.getByText("AI built with oversight and accountability")).toBeInTheDocument();
    expect(screen.getByText("Human Oversight")).toBeInTheDocument();
    expect(screen.getByText("The teams behind RMSM")).toBeInTheDocument();
    expect(screen.getByText("Leadership")).toBeInTheDocument();
    expect(screen.getByText("The values that guide how we work")).toBeInTheDocument();
    expect(screen.getByText("Integrity")).toBeInTheDocument();
    expect(screen.getByText("Designed to support institutions everywhere")).toBeInTheDocument();
    expect(screen.getByText("Professional Traders")).toBeInTheDocument();
    expect(screen.getByText("Ready to Explore RMSM?")).toBeInTheDocument();
  });

  it("does not invent named individuals in the team section", () => {
    render(<AboutPage />);
    // Team section is department-level (Leadership/Engineering/Product/Research/
    // Customer Success), not fabricated personal names or bios.
    expect(screen.getByText("Product")).toBeInTheDocument();
    expect(screen.getByText("Research")).toBeInTheDocument();
    expect(screen.getAllByText("Customer Success").length).toBeGreaterThan(0);
  });

  it("has page-specific SEO metadata distinct from other pages", () => {
    expect(metadata.title).toBe("About | RMSM");
    expect(metadata.alternates?.canonical).toBe("http://localhost:3000/company");
  });
});
