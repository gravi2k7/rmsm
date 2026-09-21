import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { MarketChartWorkspaceControls } from "../market-chart-workspace-controls";

describe("MarketChartWorkspaceControls", () => {
  it("renders the Split workspace control and Reset", () => {
    const onLayoutChange = vi.fn();
    const onResetWorkspace = vi.fn();

    render(
      <MarketChartWorkspaceControls
        layout="SPLIT"
        onLayoutChange={onLayoutChange}
        onResetWorkspace={onResetWorkspace}
      />,
    );

    const splitButton = screen.getByRole("button", {
      name: "Chart workspace",
    });

    expect(splitButton).toBeInTheDocument();
    expect(splitButton).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    expect(
      screen.getByRole("button", {
        name: "Reset chart workspace",
      }),
    ).toBeInTheDocument();
  });

  it("keeps Split active", () => {
    const onLayoutChange = vi.fn();
    const onResetWorkspace = vi.fn();

    render(
      <MarketChartWorkspaceControls
        layout="SPLIT"
        onLayoutChange={onLayoutChange}
        onResetWorkspace={onResetWorkspace}
      />,
    );

    const splitButton = screen.getByRole("button", {
      name: "Chart workspace",
    });

    expect(splitButton).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    expect(splitButton).toHaveAttribute(
      "data-active",
      "true",
    );

    fireEvent.click(splitButton);

    expect(onLayoutChange).toHaveBeenCalledWith(
      "SPLIT",
    );
  });

  it("calls reset when Reset is clicked", () => {
    const onLayoutChange = vi.fn();
    const onResetWorkspace = vi.fn();

    render(
      <MarketChartWorkspaceControls
        layout="SPLIT"
        onLayoutChange={onLayoutChange}
        onResetWorkspace={onResetWorkspace}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Reset chart workspace",
      }),
    );

    expect(onResetWorkspace).toHaveBeenCalledTimes(1);
  });
});
