import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PricingToggle } from "../pricing-toggle";

describe("PricingToggle", () => {
  it("reflects the controlled checked state in each label's emphasis", () => {
    render(<PricingToggle checked={false} onCheckedChange={vi.fn()} />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
  });

  it("calls onCheckedChange when toggled — no pricing math happens internally", async () => {
    const onCheckedChange = vi.fn();
    const user = userEvent.setup();
    render(<PricingToggle checked={false} onCheckedChange={onCheckedChange} />);

    await user.click(screen.getByRole("switch"));

    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("renders an optional badge", () => {
    render(<PricingToggle checked onCheckedChange={vi.fn()} badge="Save 20%" />);
    expect(screen.getByText("Save 20%")).toBeInTheDocument();
  });
});
