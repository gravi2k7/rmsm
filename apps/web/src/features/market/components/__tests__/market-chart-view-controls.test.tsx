import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MarketChartViewControls } from "../market-chart-view-controls";

describe("MarketChartViewControls", () => {
  function renderControls(volumeVisible = true) {
    const handlers = {
      onFitContent: vi.fn(),
      onResetView: vi.fn(),
      onZoomIn: vi.fn(),
      onZoomOut: vi.fn(),
      onAutoScale: vi.fn(),
      onToggleVolume: vi.fn(),
    };

    render(
      <MarketChartViewControls
        volumeVisible={volumeVisible}
        {...handlers}
      />,
    );

    return handlers;
  }

  it("renders all chart view controls", () => {
    renderControls();

    expect(screen.getByRole("button", { name: "Zoom in" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zoom out" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fit chart" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Reset chart view" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Auto scale price" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Hide volume" }),
    ).toBeInTheDocument();
  });

  it("dispatches every chart view action", async () => {
    const user = userEvent.setup();
    const handlers = renderControls();

    await user.click(screen.getByRole("button", { name: "Zoom in" }));
    await user.click(screen.getByRole("button", { name: "Zoom out" }));
    await user.click(screen.getByRole("button", { name: "Fit chart" }));
    await user.click(
      screen.getByRole("button", { name: "Reset chart view" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Auto scale price" }),
    );
    await user.click(screen.getByRole("button", { name: "Hide volume" }));

    expect(handlers.onZoomIn).toHaveBeenCalledTimes(1);
    expect(handlers.onZoomOut).toHaveBeenCalledTimes(1);
    expect(handlers.onFitContent).toHaveBeenCalledTimes(1);
    expect(handlers.onResetView).toHaveBeenCalledTimes(1);
    expect(handlers.onAutoScale).toHaveBeenCalledTimes(1);
    expect(handlers.onToggleVolume).toHaveBeenCalledTimes(1);
  });

  it("shows volume state correctly", () => {
    renderControls(false);

    const button = screen.getByRole("button", {
      name: "Show volume",
    });

    expect(button).toHaveAttribute("aria-pressed", "false");
  });
});
