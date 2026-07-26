import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TestimonialCard } from "../testimonial-card";

describe("TestimonialCard", () => {
  it("renders the quote, name, and role/company line", () => {
    render(<TestimonialCard quote="Great platform." name="Jane Doe" title="CTO" company="Acme" />);
    expect(screen.getByText(/Great platform\./)).toBeInTheDocument();
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("CTO · Acme")).toBeInTheDocument();
  });

  it("falls back to initials when no avatar image is given", () => {
    render(<TestimonialCard quote="Solid." name="Jane Doe" />);
    expect(screen.getByRole("img", { name: "Jane Doe" })).toHaveTextContent("JD");
  });

  it("renders an accessible star rating when provided", () => {
    render(<TestimonialCard quote="Solid." name="Jane Doe" rating={4} />);
    expect(screen.getByRole("img", { name: "Rated 4 out of 5" })).toBeInTheDocument();
  });
});
