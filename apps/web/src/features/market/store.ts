import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { CandleInterval } from "./types";
import type { DrawingState, DrawingType } from "./drawings/types";
import type { IndicatorConfig } from "./indicators/config";
import type { MarketChartLayout } from "./components/market-chart-workspace-controls";
export interface MarketWorkspace {
  interval: CandleInterval;
  activeDrawingTool: DrawingType;
  volumeVisible: boolean;
  chartLayout: MarketChartLayout;
  indicators: IndicatorConfig[];
  drawingState: DrawingState;
}

interface MarketWorkspaceState {
  workspaces: Record<string, MarketWorkspace>;

  getWorkspace: (instrumentId: string) => MarketWorkspace | undefined;
  setWorkspace: (
    instrumentId: string,
    workspace: Partial<MarketWorkspace>,
  ) => void;
  resetWorkspace: (instrumentId: string) => void;
}

export const DEFAULT_MARKET_WORKSPACE: MarketWorkspace = {
  interval: "ONE_MINUTE",
  activeDrawingTool: "SELECT",
  volumeVisible: true,
  chartLayout: "SPLIT",
  indicators: [],
  drawingState: {
    drawings: [],
    activeTool: "SELECT",
    selectedDrawingId: null,
  },
};

function cloneWorkspace(
  workspace: MarketWorkspace,
): MarketWorkspace {
  return {
    ...workspace,
    indicators: workspace.indicators.map((indicator) => ({
      ...indicator,
    })),
    drawingState: {
      ...workspace.drawingState,
      drawings: workspace.drawingState.drawings.map((drawing) => ({
        ...drawing,
        points: drawing.points.map((point) => ({ ...point })),
        style: { ...drawing.style },
      })),
    },
  };
}

export const useMarketWorkspaceStore =
  create<MarketWorkspaceState>()(
    persist(
      (set, get) => ({
        workspaces: {},

        getWorkspace: (instrumentId) => {
          const workspace = get().workspaces[instrumentId];

          return workspace
            ? cloneWorkspace(workspace)
            : undefined;
        },

        setWorkspace: (instrumentId, patch) =>
          set((state) => {
            const current =
              state.workspaces[instrumentId] ??
              cloneWorkspace(DEFAULT_MARKET_WORKSPACE);

            const next: MarketWorkspace = {
              ...current,
              ...patch,
              indicators:
                patch.indicators
                  ? patch.indicators.map((indicator) => ({
                      ...indicator,
                    }))
                  : current.indicators,
              drawingState:
                patch.drawingState
                  ? {
                      ...patch.drawingState,
                      drawings:
                        patch.drawingState.drawings.map(
                          (drawing) => ({
                            ...drawing,
                            points: drawing.points.map(
                              (point) => ({
                                ...point,
                              }),
                            ),
                            style: {
                              ...drawing.style,
                            },
                          }),
                        ),
                    }
                  : current.drawingState,
            };

            return {
              workspaces: {
                ...state.workspaces,
                [instrumentId]: next,
              },
            };
          }),

        resetWorkspace: (instrumentId) =>
          set((state) => {
            const next = {
              ...state.workspaces,
            };

            delete next[instrumentId];

            return {
              workspaces: next,
            };
          }),
      }),
      {
        name: "rmsm-web-market-workspace",
      },
    ),
  );
