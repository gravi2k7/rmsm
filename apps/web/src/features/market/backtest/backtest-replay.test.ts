import { describe, expect, it, vi } from "vitest";
import {
  createBacktestReplayController,
} from "./backtest-replay";

describe("BacktestReplayController", () => {
  it("starts at the first candle", () => {
    const controller =
      createBacktestReplayController(10);

    expect(controller.getState()).toEqual({
      cursor: 0,
      playing: false,
      speed: 1,
    });
  });

  it("steps forward and backward", () => {
    const controller =
      createBacktestReplayController(10);

    controller.stepForward();
    expect(controller.getState().cursor).toBe(1);

    controller.stepForward();
    expect(controller.getState().cursor).toBe(2);

    controller.stepBackward();
    expect(controller.getState().cursor).toBe(1);
  });

  it("does not move beyond the candle range", () => {
    const controller =
      createBacktestReplayController(2);

    controller.stepBackward();
    expect(controller.getState().cursor).toBe(0);

    controller.stepForward();
    controller.stepForward();
    controller.stepForward();

    expect(controller.getState().cursor).toBe(1);
  });

  it("resets replay", () => {
    const controller =
      createBacktestReplayController(10);

    controller.setCursor(7);

    expect(controller.getState().cursor).toBe(7);

    controller.reset();

    expect(controller.getState()).toEqual({
      cursor: 0,
      playing: false,
      speed: 1,
    });
  });

  it("notifies subscribers", () => {
    const controller =
      createBacktestReplayController(10);

    const listener = vi.fn();

    const unsubscribe =
      controller.subscribe(listener);

    controller.stepForward();

    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();

    controller.stepForward();

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("plays and stops at the final candle", () => {
    vi.useFakeTimers();

    const controller =
      createBacktestReplayController(3);

    controller.setSpeed(10);
    controller.play();

    expect(controller.getState().playing).toBe(true);

    vi.advanceTimersByTime(100);

    expect(controller.getState().cursor).toBe(1);

    vi.advanceTimersByTime(100);

    expect(controller.getState().cursor).toBe(2);
    expect(controller.getState().playing).toBe(false);

    controller.destroy();

    vi.useRealTimers();
  });
});
