import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import {
  MarketChartWorkspaceControls,
  type MarketChartLayout,
} from "../market-chart-workspace-controls";

function renderControls(
  layout: MarketChartLayout = "CHART_WITH_PANES",
) {
  const onLayoutChange = vi.fn();
  const onResetWorkspace = vi.fn();

  render(
    <MarketChartWorkspaceControls
      layout={layout}
      onLayoutChange={onLayoutChange}
      onResetWorkspace={onResetWorkspace}
    />,
  );

  return {
    onLayoutChange,
    onResetWorkspace,
  };
}

describe("MarketChartWorkspaceControls", () => {
  it("marks the active workspace layout", () => {
    renderControls("CHART_WITH_PANES");

    expect(
      screen.getByRole("button", {
        name: "Chart with indicator panes",
      }),
    ).toHaveAttribute("aria-pressed", "true");

    expect(
      screen.getByRole("button", {
        name: "Chart only",
      }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("changes the selected workspace layout", () => {
    const { onLayoutChange } =
      renderControls("CHART_WITH_PANES");

    fireEvent.click(
      screen.getByRole("button", {
        name: "Chart only",
      }),
    );

    expect(onLayoutChange).toHaveBeenCalledWith(
      "CHART_ONLY",
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Split chart workspace",
      }),
    );

    expect(onLayoutChange).toHaveBeenCalledWith(
      "SPLIT",
    );
  });

  it("resets the workspace", () => {
    const { onResetWorkspace } =
      renderControls();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Reset chart workspace",
      }),
    );

    expect(onResetWorkspace).toHaveBeenCalledTimes(1);
  });
});
