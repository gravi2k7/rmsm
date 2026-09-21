import {
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import {
  DEFAULT_MARKET_CHART_SETTINGS,
} from "../../chart-settings";
import {
  useMarketChartTemplateStore,
} from "../../chart-template-store";

describe("Market chart templates", () => {
  beforeEach(() => {
    useMarketChartTemplateStore.setState({
      templates: [],
    });
  });

  it("saves indicators and chart settings", () => {
    const template =
      useMarketChartTemplateStore
        .getState()
        .saveTemplate({
          name: "Momentum Setup",
          indicators: [
            {
              id: "rsi-20",
              type: "RSI",
              placement: "pane",
              period: 20,
              visible: true,
            },
          ],
          chartSettings:
            DEFAULT_MARKET_CHART_SETTINGS,
        });

    expect(template.name).toBe(
      "Momentum Setup",
    );

    expect(template.indicators).toHaveLength(1);
    expect(
      template.indicators[0]?.period,
    ).toBe(20);

    expect(
      template.chartSettings.appearance
        .gridVisible,
    ).toBe(true);

    expect(
      useMarketChartTemplateStore
        .getState()
        .templates,
    ).toHaveLength(1);
  });

  it("keeps template data isolated from input arrays", () => {
    const indicators = [
      {
        id: "rsi-20",
        type: "RSI" as const,
        placement: "pane" as const,
        period: 20,
        visible: true,
      },
    ];

    useMarketChartTemplateStore
      .getState()
      .saveTemplate({
        name: "Isolation Test",
        indicators,
        chartSettings:
          DEFAULT_MARKET_CHART_SETTINGS,
      });

    indicators[0]!.period = 60;

    const template =
      useMarketChartTemplateStore
        .getState()
        .templates[0];

    expect(template?.indicators[0]?.period).toBe(
      20,
    );
  });

  it("updates template metadata", () => {
    const template =
      useMarketChartTemplateStore
        .getState()
        .saveTemplate({
          name: "Original",
          indicators: [],
          chartSettings:
            DEFAULT_MARKET_CHART_SETTINGS,
        });

    useMarketChartTemplateStore
      .getState()
      .updateTemplate(template.id, {
        name: "Updated",
      });

    expect(
      useMarketChartTemplateStore
        .getState()
        .templates[0]?.name,
    ).toBe("Updated");
  });

  it("deletes a template", () => {
    const template =
      useMarketChartTemplateStore
        .getState()
        .saveTemplate({
          name: "Delete Me",
          indicators: [],
          chartSettings:
            DEFAULT_MARKET_CHART_SETTINGS,
        });

    useMarketChartTemplateStore
      .getState()
      .deleteTemplate(template.id);

    expect(
      useMarketChartTemplateStore
        .getState()
        .templates,
    ).toHaveLength(0);
  });
});
