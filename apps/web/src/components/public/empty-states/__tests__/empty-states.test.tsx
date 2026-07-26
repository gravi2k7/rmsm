import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ComingSoon } from "../coming-soon";
import { EmptyState } from "../empty-state";
import { ErrorState } from "../error-state";
import { LoadingState } from "../loading-state";

describe("Empty-state family", () => {
  it("LoadingState renders an accessible status region", () => {
    render(<LoadingState label="Fetching…" />);
    expect(screen.getByRole("status")).toHaveTextContent("Fetching…");
  });

  it("EmptyState renders a title and optional action", () => {
    render(<EmptyState title="No results" description="Try a different filter." action={<button>Reset</button>} />);
    expect(screen.getByText("No results")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset" })).toBeInTheDocument();
  });

  it("ErrorState renders an accessible alert region", () => {
    render(<ErrorState description="Please try again." />);
    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong");
    expect(screen.getByText("Please try again.")).toBeInTheDocument();
  });

  it("ComingSoon renders its default title", () => {
    render(<ComingSoon />);
    expect(screen.getByText("Coming soon")).toBeInTheDocument();
  });
});
