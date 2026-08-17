import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { QuoteQueryDto } from "./quote-query.dto";

describe("QuoteQueryDto", () => {
  const id1 = "1bf3572c-4c3f-47ba-a819-096f691e43a5";
  const id2 = "2bf3572c-4c3f-47ba-a819-096f691e43a5";

  it("normalizes a single instrumentIds query value into an array", async () => {
    const dto = plainToInstance(QuoteQueryDto, {
      instrumentIds: id1,
    });

    const errors = await validate(dto);

    expect(dto.instrumentIds).toEqual([id1]);
    expect(errors).toHaveLength(0);
  });

  it("preserves multiple instrumentIds query values", async () => {
    const dto = plainToInstance(QuoteQueryDto, {
      instrumentIds: [id1, id2],
    });

    const errors = await validate(dto);

    expect(dto.instrumentIds).toEqual([id1, id2]);
    expect(errors).toHaveLength(0);
  });

  it("rejects an invalid instrument id", async () => {
    const dto = plainToInstance(QuoteQueryDto, {
      instrumentIds: "not-a-uuid",
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });
});
