import { describe, expect, it } from "vitest";
import { MemoryService, InMemoryMemoryProvider } from "@rmsm/ai-memory";
import { ExecutiveDashboardService } from "../services/executive-dashboard.service";
import { WidgetType } from "../../domain/enums/executive-dashboard.enum";
import { FixedClock, RecordingEventPublisher, SequentialIdGenerator } from "./fakes";

const widgets = [{ id: "w1", type: WidgetType.PORTFOLIO, title: "Portfolio — p1", body: "Healthy.", generatedAt: new Date() }];
const kpis = { portfolioId: "p1", kpis: [{ name: "Win Rate", value: 60, unit: "%" }] };
const operationalMetrics = [{ name: "Open Positions", value: 2 }];
const recommendations = [{ source: "ai-portfolio-intelligence", action: "HOLD", rationale: "No changes needed." }];

describe("ExecutiveDashboardService", () => {
  it("assembles widgets + KPIs + operational metrics + recommendations (each produced elsewhere) into one dashboard and publishes a domain event", async () => {
    const eventPublisher = new RecordingEventPublisher();
    const service = new ExecutiveDashboardService(new FixedClock(), new SequentialIdGenerator(), eventPublisher);

    const dashboard = await service.generate("p1", widgets, kpis, operationalMetrics, recommendations);
    expect(dashboard.portfolioId).toBe("p1");
    expect(dashboard.widgets).toBe(widgets);
    expect(eventPublisher.published.some((e) => e.kind === "ExecutiveDashboardGenerated" && e.widgetCount === 1)).toBe(true);
  });

  it("integrates with a REAL, unmodified @rmsm/ai-memory MemoryService: persists a dashboard snapshot as a retrievable SEMANTIC memory", async () => {
    const memoryRepository = new InMemoryMemoryProvider();
    const memoryService = new MemoryService(memoryRepository);
    const service = new ExecutiveDashboardService(new FixedClock(), new SequentialIdGenerator(), undefined, memoryService);

    await service.generate("p-memory-test", widgets, kpis, operationalMetrics, recommendations);

    const result = await memoryRepository.query({ tags: ["executive-dashboard"] });
    const persisted = result.entries.find((entry) => entry.metadata.tags.includes("p-memory-test"));

    expect(persisted).toBeDefined();
    expect(persisted?.metadata.source).toBe("ai-executive-dashboard");
    expect(persisted?.content).toContain("p-memory-test");
  });
});
