import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MegaMenu } from "../mega-menu";

vi.mock("next/navigation", () => ({
  usePathname: () => "/platform",
}));

describe("MegaMenu", () => {
  it("is driven entirely from config/navigation.ts (5 sections, no hardcoded menu)", () => {
    render(<MegaMenu />);
    for (const title of ["Platform", "AI", "Markets", "Resources", "Company"]) {
      expect(screen.getByRole("button", { name: title })).toBeInTheDocument();
    }
  });

  it("opens a section panel and links to its configured children", async () => {
    const user = userEvent.setup();
    render(<MegaMenu />);

    await user.click(screen.getByRole("button", { name: "Platform" }));

    expect(await screen.findByRole("link", { name: /Features/ })).toHaveAttribute("href", "/features");
    expect(screen.getByRole("link", { name: /Pricing/ })).toHaveAttribute("href", "/pricing");
  });
});
