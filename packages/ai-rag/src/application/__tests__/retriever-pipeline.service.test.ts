import { describe, it, expect } from "vitest";
import { RetrieverPipeline } from "../services/retriever-pipeline.service";
import { KeywordRetriever } from "../../infrastructure/keyword.retriever";
import { FixedClock, SequentialIdGenerator, RecordingEventPublisher } from "./fakes";

describe("RetrieverPipeline", () => {
  it("runs a retrieval and publishes RetrievalCompleted", async () => {
    const retriever = new KeywordRetriever();
    retriever.index([{ id: "c1", text: "cats are mammals" }]);
    const events = new RecordingEventPublisher();
    const pipeline = new RetrieverPipeline(retriever, new FixedClock(new Date()), new SequentialIdGenerator(), events);

    const results = await pipeline.run({ text: "cats", topK: 5 });

    expect(results).toHaveLength(1);
    expect(events.published.map((e) => e.kind)).toEqual(["RetrievalCompleted"]);
  });
});
