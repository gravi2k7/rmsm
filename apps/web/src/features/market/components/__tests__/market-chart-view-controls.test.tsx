import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MarketChartViewControls } from "../market-chart-view-controls";

describe("MarketChartViewControls", () => {
  function renderControls() {
    const handlers = {
      onResetView: vi.fn(),
      onZoomIn: vi.fn(),
      onZoomOut: vi.fn(),
      onScrollLeft: vi.fn(),
      onScrollRight: vi.fn(),
    };

    render(
      <MarketChartViewControls {...handlers} />,
    );

    return handlers;
  }

  it("renders all chart navigation controls", () => {
    renderControls();

    expect(
      screen.getByRole("button", { name: "Zoom in" }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Zoom out" }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Scroll chart left" }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Scroll chart right" }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Reset chart view" }),
    ).toBeInTheDocument();
  });

  it("dispatches every chart navigation action", async () => {
    const user = userEvent.setup();
    const handlers = renderControls();

    await user.click(
      screen.getByRole("button", { name: "Zoom in" }),
    );

    await user.click(
      screen.getByRole("button", { name: "Zoom out" }),
    );

    await user.click(
      screen.getByRole("button", { name: "Scroll chart left" }),
    );

    await user.click(
      screen.getByRole("button", { name: "Scroll chart right" }),
    );

    await user.click(
      screen.getByRole("button", { name: "Reset chart view" }),
    );

    expect(handlers.onZoomIn).toHaveBeenCalledTimes(1);
    expect(handlers.onZoomOut).toHaveBeenCalledTimes(1);
    expect(handlers.onScrollLeft).toHaveBeenCalledTimes(1);
    expect(handlers.onScrollRight).toHaveBeenCalledTimes(1);
    expect(handlers.onResetView).toHaveBeenCalledTimes(1);
  });

  it("renders the navigation control group", () => {
    renderControls();

    expect(
      screen.getByRole("group", {
        name: "Chart navigation controls",
      }),
    ).toBeInTheDocument();
  });
});
