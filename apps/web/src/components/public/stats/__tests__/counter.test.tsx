import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Counter } from "../counter";

describe("Counter", () => {
  it("counts up to the target value once scrolled into view", async () => {
    // Short duration keeps the animation loop well inside Testing
    // Library's default findBy poll window instead of the real 1200ms
    // default, which would make this test flaky.
    render(<Counter value={1234} suffix="+" durationMs={10} />);
    expect(await screen.findByText("1,234+")).toBeInTheDocument();
  });

  it("applies an optional prefix", async () => {
    render(<Counter value={99} prefix="$" durationMs={10} />);
    expect(await screen.findByText("$99")).toBeInTheDocument();
  });
});
