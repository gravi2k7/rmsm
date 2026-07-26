import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { LogoCloud } from "../logo-cloud";

describe("LogoCloud", () => {
  const logos = [{ name: "Acme Corp" }, { name: "Globex" }];

  it("renders every configured logo (text fallback when no src given)", () => {
    render(<LogoCloud logos={logos} />);
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("Globex")).toBeInTheDocument();
  });

  it("renders an optional title", () => {
    render(<LogoCloud title="Trusted by" logos={logos} />);
    expect(screen.getByText("Trusted by")).toBeInTheDocument();
  });

  it("renders nothing when given an empty logo list", () => {
    const { container } = render(<LogoCloud logos={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("duplicates the logo list for a seamless marquee loop", () => {
    render(<LogoCloud logos={logos} variant="marquee" />);
    expect(screen.getAllByText("Acme Corp")).toHaveLength(2);
  });
});
