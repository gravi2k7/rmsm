import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import ContactPage, { metadata } from "../page";

describe("ContactPage (WM-010R)", () => {
  it("renders the hero headline and Request Demo / Talk to Sales CTAs", () => {
    render(<ContactPage />);
    expect(screen.getByRole("heading", { level: 1, name: /^contact rmsm$/i })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /request demo/i })[0]).toHaveAttribute("href", "#contact-form");
    expect(screen.getByRole("link", { name: /talk to sales/i })).toHaveAttribute("href", "#contact-options");
  });

  it("renders every WM-010R section", () => {
    render(<ContactPage />);
    expect(screen.getByText("Reach the right team, faster")).toBeInTheDocument();
    expect(screen.getByText("Sales")).toBeInTheDocument();
    expect(screen.getByText("Enterprise Licensing")).toBeInTheDocument();
    expect(screen.getByText("Send us a message")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /submit request/i })).toBeInTheDocument();
    expect(screen.getByText("Support across your engagement")).toBeInTheDocument();
    expect(screen.getByText("Product Demonstrations")).toBeInTheDocument();
    expect(screen.getByText("A remote-first, globally available team")).toBeInTheDocument();
    expect(screen.getByText("Global Support")).toBeInTheDocument();
    expect(screen.getByText("How quickly will someone respond?")).toBeInTheDocument();
    expect(screen.getByText("Let's Build the Future of Intelligent Investment Operations")).toBeInTheDocument();
  });

  it("routes every contact-option card and the final CTA to the one real contact form", () => {
    render(<ContactPage />);
    expect(screen.getAllByRole("link", { name: /contact sales/i })[0]).toHaveAttribute("href", "#contact-form");
    expect(screen.getByRole("link", { name: /discuss licensing/i })).toHaveAttribute("href", "#contact-form");
  });

  it("has page-specific SEO metadata distinct from other pages", () => {
    expect(metadata.title).toBe("Contact | RMSM");
    expect(metadata.alternates?.canonical).toBe("http://localhost:3000/contact");
  });
});
