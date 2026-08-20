import { describe, expect, it, beforeEach } from "vitest";

import {
  DEFAULT_MARKET_WORKSPACE,
  useMarketWorkspaceStore,
} from "@/features/market/store";

describe("Market workspace persistence", () => {
  beforeEach(() => {
    useMarketWorkspaceStore.setState({
      workspaces: {},
    });
  });

  it("keeps workspaces isolated by instrument", () => {
    const store = useMarketWorkspaceStore.getState();

    store.setWorkspace("instrument-a", {
      interval: "FIVE_MINUTES",
      activeDrawingTool: "TREND_LINE",
      volumeVisible: false,
      chartLayout: "CHART_ONLY",
    });

    store.setWorkspace("instrument-b", {
      interval: "ONE_HOUR",
      activeDrawingTool: "SELECT",
      volumeVisible: true,
      chartLayout: "SPLIT",
    });

    const instrumentA =
      useMarketWorkspaceStore
        .getState()
        .getWorkspace("instrument-a");

    const instrumentB =
      useMarketWorkspaceStore
        .getState()
        .getWorkspace("instrument-b");

    expect(instrumentA).toMatchObject({
      interval: "FIVE_MINUTES",
      activeDrawingTool: "TREND_LINE",
      volumeVisible: false,
      chartLayout: "CHART_ONLY",
    });

    expect(instrumentB).toMatchObject({
      interval: "ONE_HOUR",
      activeDrawingTool: "SELECT",
      volumeVisible: true,
      chartLayout: "SPLIT",
    });
  });

  it("uses the canonical default workspace for a new instrument", () => {
    const workspace =
      useMarketWorkspaceStore
        .getState()
        .getWorkspace("new-instrument");

    expect(workspace).toBeUndefined();

    expect(DEFAULT_MARKET_WORKSPACE).toMatchObject({
      interval: "ONE_MINUTE",
      activeDrawingTool: "SELECT",
      volumeVisible: true,
      chartLayout: "SPLIT",
      indicators: [],
    });
  });

  it("persists indicators without sharing the array reference", () => {
    const indicators = [
      {
        id: "ema-20",
        type: "EMA",
        period: 20,
        visible: true,
        placement: "overlay",
      },
    ] as never[];

    useMarketWorkspaceStore
      .getState()
      .setWorkspace("instrument-a", {
        indicators,
      });

    const workspace =
      useMarketWorkspaceStore
        .getState()
        .getWorkspace("instrument-a");

    expect(workspace?.indicators).toEqual(indicators);
    expect(workspace?.indicators).not.toBe(indicators);
  });

  it("persists drawing state without sharing mutable structures", () => {
    const drawingState = {
      drawings: [],
      activeTool: "SELECT" as const,
      selectedDrawingId: null,
    };

    useMarketWorkspaceStore
      .getState()
      .setWorkspace("instrument-a", {
        drawingState,
      });

    const workspace =
      useMarketWorkspaceStore
        .getState()
        .getWorkspace("instrument-a");

    expect(workspace?.drawingState).toEqual(drawingState);
    expect(workspace?.drawingState).not.toBe(drawingState);
  });

  it("reset removes only the selected instrument workspace", () => {
    const store = useMarketWorkspaceStore.getState();

    store.setWorkspace("instrument-a", {
      interval: "FIFTEEN_MINUTES",
    });

    store.setWorkspace("instrument-b", {
      interval: "ONE_HOUR",
    });

    store.resetWorkspace("instrument-a");

    expect(
      useMarketWorkspaceStore
        .getState()
        .getWorkspace("instrument-a"),
    ).toBeUndefined();

    expect(
      useMarketWorkspaceStore
        .getState()
        .getWorkspace("instrument-b"),
    ).toMatchObject({
      interval: "ONE_HOUR",
    });
  });
});
