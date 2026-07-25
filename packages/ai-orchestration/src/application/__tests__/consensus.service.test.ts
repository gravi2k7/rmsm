import { describe, expect, it } from "vitest";
import { ConsensusService } from "../services/consensus.service";
import { MajorityConsensusStrategy } from "../../infrastructure/majority-consensus.strategy";
import { SystemLikeClock, SequentialIdGenerator, RecordingEventPublisher } from "./fakes";

describe("ConsensusService", () => {
  it("decides a proposal via the injected strategy and publishes ConsensusReached", async () => {
    const events = new RecordingEventPublisher();
    const service = new ConsensusService(new MajorityConsensusStrategy(), new SystemLikeClock(), new SequentialIdGenerator(), events);

    const result = await service.decide("coordinator-1", "adopt plan B", { "worker-1": true, "worker-2": true, "worker-3": false });

    expect(result.approved).toBe(true);
    expect(events.published.map((e) => e.kind)).toEqual(["ConsensusReached"]);
  });
});
