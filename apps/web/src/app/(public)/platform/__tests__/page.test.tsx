import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import PlatformPage, { metadata } from "../page";

describe("PlatformPage (WM-005R)", () => {
  it("renders the hero headline and Request Enterprise Demo / View Architecture CTAs", () => {
    render(<PlatformPage />);
    expect(screen.getByRole("heading", { level: 1, name: /enterprise trading intelligence platform/i })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /request enterprise demo/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /view architecture/i })).toHaveAttribute("href", "#architecture");
  });

  it("renders every WM-005R section", () => {
    render(<PlatformPage />);
    expect(screen.getByText("A modular enterprise platform")).toBeInTheDocument();
    expect(screen.getByText("Market Intelligence")).toBeInTheDocument();
    expect(screen.getByText("A layered architecture, end to end")).toBeInTheDocument();
    expect(screen.getByText("Presentation")).toBeInTheDocument();
    expect(screen.getByText("Data Layer")).toBeInTheDocument();
    expect(screen.getByText("Every domain your enterprise needs")).toBeInTheDocument();
    expect(screen.getByText("Administration")).toBeInTheDocument();
    expect(screen.getByText("Built for enterprise IT from the ground up")).toBeInTheDocument();
    expect(screen.getByText("Multi-Tenant")).toBeInTheDocument();
    expect(screen.getByText("A modern, proven technology foundation")).toBeInTheDocument();
    expect(screen.getByText("Next.js")).toBeInTheDocument();
    expect(screen.getByText("Deploy the way your enterprise requires")).toBeInTheDocument();
    expect(screen.getByText("Enterprise-grade security by default")).toBeInTheDocument();
    expect(screen.getByText("Connects to the systems you already run")).toBeInTheDocument();
    expect(screen.getByText("Business outcomes, not just features")).toBeInTheDocument();
    expect(screen.getByText("See the RMSM enterprise platform in action")).toBeInTheDocument();
  });

  it("has page-specific SEO metadata distinct from the homepage", () => {
    expect(metadata.title).toBe("Platform | RMSM");
    expect(metadata.alternates?.canonical).toBe("http://localhost:3000/platform");
  });
});
