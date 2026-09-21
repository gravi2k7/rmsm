import {
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { BacktestReplayToolbar } from "./backtest-replay-toolbar";

describe("BacktestReplayToolbar", () => {
  const baseState = {
    cursor: 2,
    playing: false,
    speed: 1,
  };

  it("renders replay controls and candle progress", () => {
    render(
      <BacktestReplayToolbar
        state={baseState}
        candleCount={10}
        onReset={vi.fn()}
        onStepBackward={vi.fn()}
        onToggle={vi.fn()}
        onStepForward={vi.fn()}
        onSpeedChange={vi.fn()}
      />,
    );

    expect(
      screen.getByTestId("backtest-replay-toolbar"),
    ).toBeInTheDocument();

    expect(
      screen.getByTestId("backtest-replay-counter"),
    ).toHaveTextContent("3 / 10");

    expect(
      screen.getByRole("button", {
        name: "Play replay",
      }),
    ).toBeInTheDocument();
  });

  it("calls replay actions", () => {
    const onReset = vi.fn();
    const onStepBackward = vi.fn();
    const onToggle = vi.fn();
    const onStepForward = vi.fn();

    render(
      <BacktestReplayToolbar
        state={baseState}
        candleCount={10}
        onReset={onReset}
        onStepBackward={onStepBackward}
        onToggle={onToggle}
        onStepForward={onStepForward}
        onSpeedChange={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Reset replay",
      }),
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Step backward",
      }),
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Play replay",
      }),
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Step forward",
      }),
    );

    expect(onReset).toHaveBeenCalledTimes(1);
    expect(onStepBackward).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onStepForward).toHaveBeenCalledTimes(1);
  });

  it("changes replay speed", () => {
    const onSpeedChange = vi.fn();

    render(
      <BacktestReplayToolbar
        state={baseState}
        candleCount={10}
        onReset={vi.fn()}
        onStepBackward={vi.fn()}
        onToggle={vi.fn()}
        onStepForward={vi.fn()}
        onSpeedChange={onSpeedChange}
      />,
    );

    fireEvent.change(
      screen.getByRole("combobox", {
        name: "Replay speed",
      }),
      {
        target: { value: "4" },
      },
    );

    expect(onSpeedChange).toHaveBeenCalledWith(4);
  });

  it("disables backward controls at the beginning", () => {
    render(
      <BacktestReplayToolbar
        state={{
          ...baseState,
          cursor: 0,
        }}
        candleCount={10}
        onReset={vi.fn()}
        onStepBackward={vi.fn()}
        onToggle={vi.fn()}
        onStepForward={vi.fn()}
        onSpeedChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", {
        name: "Reset replay",
      }),
    ).toBeDisabled();

    expect(
      screen.getByRole("button", {
        name: "Step backward",
      }),
    ).toBeDisabled();
  });

  it("disables forward controls at the end", () => {
    render(
      <BacktestReplayToolbar
        state={{
          ...baseState,
          cursor: 9,
        }}
        candleCount={10}
        onReset={vi.fn()}
        onStepBackward={vi.fn()}
        onToggle={vi.fn()}
        onStepForward={vi.fn()}
        onSpeedChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", {
        name: "Step forward",
      }),
    ).toBeDisabled();
  });
});
