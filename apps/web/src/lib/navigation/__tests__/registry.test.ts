import { describe, expect, it } from "vitest";
import {
  NAVIGATION_REGISTRY,
  NAVIGATION_SECTIONS,
  getNavigationItems,
  getNavigationSections,
} from "../registry";

describe("navigation registry", () => {
  it("keeps the target navigation section structure", () => {
    const sections = getNavigationSections({
      hasPermission: () => true,
    });

    expect(sections.map((section) => section.title)).toEqual([
      "TRADING",
      "AUTOMATION",
      "INTEGRATIONS",
      "OTHER",
    ]);

    expect(
      sections.map((section) => section.items.map((item) => item.label)),
    ).toEqual([
      ["Dashboard", "Market Watch", "Portfolio", "Analytics"],
      ["Strategies", "Copier"],
      ["Brokers"],
      ["Notifications", "Team", "Security"],
    ]);
  });

  it("keeps the flattened registry in target display order", () => {
    const items = getNavigationItems({
      hasPermission: () => true,
    });

    expect(items.map((item) => item.label)).toEqual([
      "Dashboard",
      "Market Watch",
      "Portfolio",
      "Analytics",
      "Strategies",
      "Copier",
      "Brokers",
      "Notifications",
      "Team",
      "Security",
    ]);
  });

  it("keeps Dashboard on the dashboard route", () => {
    expect(NAVIGATION_REGISTRY[0]).toMatchObject({
      id: "dashboard",
      label: "Dashboard",
      href: "/dashboard",
    });
  });

  it("keeps the four navigation groups registered", () => {
    expect(NAVIGATION_SECTIONS.map((section) => section.id)).toEqual([
      "trading",
      "automation",
      "integrations",
      "other",
    ]);
  });
});
