import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import AiPage, { metadata } from "../page";

describe("AiPage (WM-006R)", () => {
  it("renders the hero headline and Request AI Demo / Explore AI Architecture CTAs", () => {
    render(<AiPage />);
    expect(screen.getByRole("heading", { level: 1, name: /enterprise ai platform/i })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /request ai demo/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /explore ai architecture/i })).toHaveAttribute("href", "#architecture");
  });

  it("renders every WM-006R section", () => {
    render(<AiPage />);
    expect(screen.getByText("The RMSM AI ecosystem")).toBeInTheDocument();
    expect(screen.getByText("AI Agents")).toBeInTheDocument();
    expect(screen.getByText("A broad, grounded set of AI capabilities")).toBeInTheDocument();
    expect(screen.getByText("Enterprise agents for every workflow")).toBeInTheDocument();
    expect(screen.getByText("Trading Copilot")).toBeInTheDocument();
    expect(screen.getByText("A layered AI architecture, end to end")).toBeInTheDocument();
    expect(screen.getByText("Enterprise Data Sources")).toBeInTheDocument();
    expect(screen.getByText("AI across every platform domain")).toBeInTheDocument();
    expect(screen.getByText("Orchestrated, auditable AI workflows")).toBeInTheDocument();
    expect(screen.getByText("Grounded in your enterprise knowledge")).toBeInTheDocument();
    expect(screen.getByText("Enterprise-grade AI governance by default")).toBeInTheDocument();
    expect(screen.getByText("A modern, proven AI technology foundation")).toBeInTheDocument();
    expect(screen.getByText("OpenAI")).toBeInTheDocument();
    expect(screen.getByText("Business outcomes, not just AI features")).toBeInTheDocument();
    expect(screen.getByText("Bring enterprise AI to your trading desk")).toBeInTheDocument();
  });

  it("has page-specific SEO metadata distinct from other pages", () => {
    expect(metadata.title).toBe("AI Solutions | RMSM");
    expect(metadata.alternates?.canonical).toBe("http://localhost:3000/ai");
  });
});
