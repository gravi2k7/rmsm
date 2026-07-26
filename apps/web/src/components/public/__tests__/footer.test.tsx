import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Footer } from "../footer";

describe("Footer", () => {
  it("renders every configured section and its links", () => {
    render(<Footer />);

    for (const title of ["Platform", "Products", "Resources", "Company", "Legal"]) {
      expect(screen.getByRole("heading", { name: title, level: 2 })).toBeInTheDocument();
    }
    expect(screen.getByRole("link", { name: "Pricing" })).toHaveAttribute("href", "/pricing");
    expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/legal/privacy");
  });

  it("renders a dynamic copyright year", () => {
    render(<Footer />);
    const year = new Date().getFullYear().toString();
    expect(screen.getByText(new RegExp(year))).toBeInTheDocument();
  });

  it("renders the newsletter placeholder as disabled (no submission wiring yet)", () => {
    render(<Footer />);
    expect(screen.getByPlaceholderText("you@company.com")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Subscribe" })).toBeDisabled();
  });
});
