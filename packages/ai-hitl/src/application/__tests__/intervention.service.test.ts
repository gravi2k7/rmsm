import { describe, expect, it } from "vitest";
import { InterventionService } from "../services/intervention.service";
import { DecisionRecordService } from "../services/decision-record.service";
import { InMemoryManualInterventionRepository } from "../../infrastructure/in-memory-manual-intervention.repository";
import { InMemoryDecisionRecordRepository } from "../../infrastructure/in-memory-decision-record.repository";
import { InterventionStatus } from "../../domain/enums/hitl.enum";
import { InterventionNotFoundError, InterventionAlreadyResolvedError } from "../../domain/errors/hitl-domain.errors";
import { FixedClock, SequentialIdGenerator, RecordingEventPublisher } from "./fakes";

function buildServices(events?: RecordingEventPublisher) {
  const interventionRepository = new InMemoryManualInterventionRepository();
  const decisionRepository = new InMemoryDecisionRecordRepository();
  const interventions = new InterventionService(interventionRepository, decisionRepository, new FixedClock(), new SequentialIdGenerator(), events);
  const decisions = new DecisionRecordService(decisionRepository);
  return { interventions, decisions };
}

describe("InterventionService", () => {
  it("requests and resolves a manual intervention, recording a decision", async () => {
    const events = new RecordingEventPublisher();
    const { interventions, decisions } = buildServices(events);

    const requested = await interventions.requestIntervention("agent-1", "stuck in a loop", "exec-1");
    expect(requested.status).toBe(InterventionStatus.REQUESTED);

    const resolved = await interventions.resolveIntervention(requested.id, "operator-1", "restarted the agent");
    expect(resolved.status).toBe(InterventionStatus.RESOLVED);

    const records = await decisions.listForSubject(requested.id);
    expect(records).toHaveLength(1);
    expect(records[0]?.decision).toBe("RESOLVED");

    expect(events.published.map((e) => e.kind)).toEqual(["InterventionRequested", "InterventionResolved", "DecisionRecorded"]);
  });

  it("rejects resolving an already-resolved intervention", async () => {
    const { interventions } = buildServices();
    const requested = await interventions.requestIntervention("agent-1", "stuck", undefined);
    await interventions.resolveIntervention(requested.id, "operator-1", "fixed");

    await expect(interventions.resolveIntervention(requested.id, "operator-1", "again")).rejects.toThrow(InterventionAlreadyResolvedError);
  });

  it("throws InterventionNotFoundError for an unknown id", async () => {
    const { interventions } = buildServices();
    await expect(interventions.getIntervention("missing")).rejects.toThrow(InterventionNotFoundError);
  });
});
