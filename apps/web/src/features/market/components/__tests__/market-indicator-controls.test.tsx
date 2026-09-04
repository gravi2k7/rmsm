import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  DEFAULT_INDICATORS,
  type IndicatorConfig,
} from "../../indicators/config";
import { MarketIndicatorControls } from "../market-indicator-controls";

describe("MarketIndicatorControls", () => {
  function renderControls(
    indicators: IndicatorConfig[] = DEFAULT_INDICATORS,
  ) {
    return render(
      <MarketIndicatorControls
        indicators={indicators}
        onToggle={vi.fn()}
        onUpdate={vi.fn()}
      />,
    );
  }

  it("opens the indicator menu", () => {
    renderControls();

    fireEvent.click(
      screen.getByTestId("market-indicator-controls"),
    );

    expect(
      screen.getByTestId("market-indicator-menu"),
    ).toBeInTheDocument();

    expect(screen.getByText("SMA 20")).toBeInTheDocument();
    expect(screen.getByText("MACD 12,26,9")).toBeInTheDocument();
  });

  it("toggles an indicator", () => {
    const onToggle = vi.fn();

    render(
      <MarketIndicatorControls
        indicators={DEFAULT_INDICATORS}
        onToggle={onToggle}
        onUpdate={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByTestId("market-indicator-controls"),
    );

    fireEvent.click(
      screen.getByTestId("indicator-toggle-rsi-14"),
    );

    expect(onToggle).toHaveBeenCalledWith("rsi-14");
  });

  it("opens SMA parameters", () => {
    renderControls();

    fireEvent.click(
      screen.getByTestId("market-indicator-controls"),
    );

    fireEvent.click(
      screen.getByTestId("indicator-edit-sma-20"),
    );

    expect(
      screen.getByTestId("indicator-parameters-sma-20"),
    ).toBeInTheDocument();

    expect(
      screen.getByTestId("indicator-param-Period"),
    ).toHaveValue(20);
  });

  it("updates SMA period", () => {
    const onUpdate = vi.fn();

    render(
      <MarketIndicatorControls
        indicators={DEFAULT_INDICATORS}
        onToggle={vi.fn()}
        onUpdate={onUpdate}
      />,
    );

    fireEvent.click(
      screen.getByTestId("market-indicator-controls"),
    );

    fireEvent.click(
      screen.getByTestId("indicator-edit-sma-20"),
    );

    fireEvent.change(
      screen.getByTestId("indicator-param-Period"),
      { target: { value: "50" } },
    );

    expect(onUpdate).toHaveBeenCalledWith(
      "sma-20",
      { period: 50 },
    );
  });

  it("supports MACD parameters", () => {
    renderControls();

    fireEvent.click(
      screen.getByTestId("market-indicator-controls"),
    );

    fireEvent.click(
      screen.getByTestId("indicator-edit-macd-12-26-9"),
    );

    expect(
      screen.getByTestId("indicator-param-Fast"),
    ).toHaveValue(12);

    expect(
      screen.getByTestId("indicator-param-Slow"),
    ).toHaveValue(26);

    expect(
      screen.getByTestId("indicator-param-Signal"),
    ).toHaveValue(9);
  });

  it("supports Bollinger parameters", () => {
    renderControls();

    fireEvent.click(
      screen.getByTestId("market-indicator-controls"),
    );

    fireEvent.click(
      screen.getByTestId("indicator-edit-bollinger-20"),
    );

    expect(
      screen.getByTestId("indicator-param-Period"),
    ).toHaveValue(20);

    expect(
      screen.getByTestId("indicator-param-Std Dev"),
    ).toHaveValue(2);
  });

  it("supports Stochastic parameters", () => {
    renderControls();

    fireEvent.click(
      screen.getByTestId("market-indicator-controls"),
    );

    fireEvent.click(
      screen.getByTestId("indicator-edit-stochastic-14-3-3"),
    );

    expect(
      screen.getByTestId("indicator-param-Period"),
    ).toHaveValue(14);

    expect(
      screen.getByTestId("indicator-param-%K"),
    ).toHaveValue(3);

    expect(
      screen.getByTestId("indicator-param-%D"),
    ).toHaveValue(3);
  });

  it("shows VWAP has no parameters", () => {
    renderControls();

    fireEvent.click(
      screen.getByTestId("market-indicator-controls"),
    );

    fireEvent.click(
      screen.getByTestId("indicator-edit-vwap"),
    );

    expect(screen.getByText("No parameters")).toBeInTheDocument();
  });
});
