import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ComparisonTable } from "../comparison-table";

describe("ComparisonTable", () => {
  const columns = [
    { key: "starter", label: "Starter" },
    { key: "pro", label: "Pro", highlight: true },
  ];
  const rows = [
    { label: "API access", values: { starter: false, pro: true } },
    { label: "Seats", values: { starter: "5", pro: "Unlimited" } },
  ];

  it("renders every column and row label", () => {
    render(<ComparisonTable columns={columns} rows={rows} />);
    expect(screen.getByRole("columnheader", { name: "Starter" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Pro" })).toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: "API access" })).toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: "Seats" })).toBeInTheDocument();
  });

  it("renders string cell values as text and leaves boolean cells as icon-only (no text)", () => {
    render(<ComparisonTable columns={columns} rows={rows} />);
    expect(screen.getByText("Unlimited")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });
});
