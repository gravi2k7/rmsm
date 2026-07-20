import { describe, expect, it, beforeEach } from "vitest";
import { usePreferencesStore } from "../store";

describe("preferences store", () => {
  beforeEach(() => {
    usePreferencesStore.setState({
      tableDensity: "comfortable",
      defaultTimeframe: "ONE_HOUR",
      defaultMarket: "FOREX",
      defaultLandingPage: "/dashboard",
      reduceMotion: false,
    });
  });

  it("starts with sensible defaults", () => {
    const state = usePreferencesStore.getState();
    expect(state.tableDensity).toBe("comfortable");
    expect(state.defaultLandingPage).toBe("/dashboard");
  });

  it("setTableDensity() updates only table density", () => {
    usePreferencesStore.getState().setTableDensity("compact");
    expect(usePreferencesStore.getState().tableDensity).toBe("compact");
  });

  it("setDefaultLandingPage() updates the landing page preference", () => {
    usePreferencesStore.getState().setDefaultLandingPage("/portfolio");
    expect(usePreferencesStore.getState().defaultLandingPage).toBe("/portfolio");
  });

  it("setReduceMotion() toggles the accessibility preference", () => {
    usePreferencesStore.getState().setReduceMotion(true);
    expect(usePreferencesStore.getState().reduceMotion).toBe(true);
  });

  it("setDefaultTimeframe() and setDefaultMarket() update independently", () => {
    usePreferencesStore.getState().setDefaultTimeframe("ONE_DAY");
    usePreferencesStore.getState().setDefaultMarket("CRYPTO");
    const state = usePreferencesStore.getState();
    expect(state.defaultTimeframe).toBe("ONE_DAY");
    expect(state.defaultMarket).toBe("CRYPTO");
  });
});
