import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NavList } from "../nav-list";
import { useAuthStore } from "@/lib/auth-store";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

describe("NavList", () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: "token", refreshToken: "refresh", user: { sub: "u1", email: "a@b.com", roles: [], permissions: [], sessionId: "s1" } });
  });

  it("hides the Enterprise Operations group entirely when the user has none of its permissions", () => {
    render(<NavList />);
    expect(screen.queryByText("Enterprise Operations")).not.toBeInTheDocument();
  });

  it("shows the group collapsed by default and expands only its permitted items on click", () => {
    useAuthStore.setState({
      user: { sub: "u1", email: "a@b.com", roles: [], permissions: ["admin.dashboard.read", "billing.admin.manage"], sessionId: "s1" },
    });
    render(<NavList />);

    const groupButton = screen.getByRole("button", { name: /enterprise operations/i });
    expect(groupButton).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Billing Dashboard")).not.toBeInTheDocument();

    fireEvent.click(groupButton);

    expect(groupButton).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Billing Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Subscription Plans")).toBeInTheDocument();
    // Not granted this permission — should stay hidden even once expanded.
    expect(screen.queryByText("License Management")).not.toBeInTheDocument();
  });

  it("calls onNavigate when a flat top-level item is clicked", () => {
    const onNavigate = vi.fn();
    render(<NavList onNavigate={onNavigate} />);
    fireEvent.click(screen.getByText("Dashboard"));
    expect(onNavigate).toHaveBeenCalledOnce();
  });

  it("shows the Market Data group, gated the same way as Enterprise Operations, once granted its permissions", () => {
    useAuthStore.setState({
      user: { sub: "u1", email: "a@b.com", roles: [], permissions: ["market-data.admin.manage", "market-data.read"], sessionId: "s1" },
    });
    render(<NavList />);

    expect(screen.queryByText("Enterprise Operations")).not.toBeInTheDocument();

    const groupButton = screen.getByRole("button", { name: /market data/i });
    fireEvent.click(groupButton);

    expect(screen.getByText("Providers")).toBeInTheDocument();
    expect(screen.getByText("Instruments")).toBeInTheDocument();
    // Requires "market-data.import.trigger", not granted here — should stay hidden even once expanded.
    expect(screen.queryByText("Historical Import")).not.toBeInTheDocument();
  });
});
