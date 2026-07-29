import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MobileNav } from "../mobile-nav";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

describe("MobileNav", () => {
  it("renders nothing when closed", () => {
    render(<MobileNav open={false} onOpenChange={vi.fn()} />);
    expect(screen.queryByText("Platform")).not.toBeInTheDocument();
  });

  it("lists every mega-menu section when open, and expands one to reveal its links", async () => {
    const user = userEvent.setup();
    render(<MobileNav open onOpenChange={vi.fn()} />);

    expect(screen.getByText("Platform")).toBeInTheDocument();
    expect(screen.getByText("Resources")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Platform" }));
    expect(await screen.findByRole("link", { name: "Features" })).toHaveAttribute("href", "/features");
  });
it("closes the drawer when a link is clicked", async () => {
  const onOpenChange = vi.fn();
  const user = userEvent.setup();
  render(<MobileNav open onOpenChange={onOpenChange} />);

  await user.click(screen.getByRole("link", { name: "Login" }));
  expect(onOpenChange).toHaveBeenCalledWith(false);

  // Flush jsdom's queued navigation callback
  await new Promise((resolve) => setTimeout(resolve, 0));
});
});
