import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DollarSign } from "lucide-react";
import { StatCard } from "../stat-card";
import { PageHeader } from "../page-header";
import { LoadingState, ErrorState, EmptyState } from "../data-states";
import { ApiError } from "@/lib/api-client";

describe("StatCard", () => {
  it("renders the label and value", () => {
    render(<StatCard label="Portfolio Value" value="$100,000" icon={DollarSign} />);
    expect(screen.getByText("Portfolio Value")).toBeInTheDocument();
    expect(screen.getByText("$100,000")).toBeInTheDocument();
  });

  it("renders a trend when provided, with no trend text when omitted", () => {
    const { rerender } = render(<StatCard label="Daily P&L" value="$500" icon={DollarSign} trend="Profitable today" trendDirection="up" />);
    expect(screen.getByText("Profitable today")).toBeInTheDocument();

    rerender(<StatCard label="Daily P&L" value="$500" icon={DollarSign} />);
    expect(screen.queryByText("Profitable today")).not.toBeInTheDocument();
  });
});

describe("PageHeader", () => {
  it("renders title, description, and actions", () => {
    render(<PageHeader title="Strategies" description="Manage trading strategies" actions={<button>New Strategy</button>} />);
    expect(screen.getByRole("heading", { name: "Strategies" })).toBeInTheDocument();
    expect(screen.getByText("Manage trading strategies")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New Strategy" })).toBeInTheDocument();
  });

  it("omits the description paragraph when none is given", () => {
    render(<PageHeader title="Strategies" />);
    expect(screen.getByRole("heading", { name: "Strategies" })).toBeInTheDocument();
  });
});

describe("LoadingState / ErrorState / EmptyState", () => {
  it("LoadingState renders one status region per skeleton row", () => {
    render(<LoadingState rows={3} />);
    expect(screen.getAllByRole("status")).toHaveLength(3);
  });

  it("ErrorState surfaces an ApiError's own message and calls onRetry", () => {
    const onRetry = vi.fn();
    render(<ErrorState error={new ApiError({ message: "Strategy not found.", statusCode: 404 })} onRetry={onRetry} />);
    expect(screen.getByText("Strategy not found.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("ErrorState falls back to a generic message for a non-ApiError", () => {
    render(<ErrorState error={new Error("network down")} />);
    expect(screen.getByText("network down")).toBeInTheDocument();
  });

  it("EmptyState renders the given title and description", () => {
    render(<EmptyState title="No strategies yet" description="Create your first one to get started." />);
    expect(screen.getByText("No strategies yet")).toBeInTheDocument();
    expect(screen.getByText("Create your first one to get started.")).toBeInTheDocument();
  });
});
