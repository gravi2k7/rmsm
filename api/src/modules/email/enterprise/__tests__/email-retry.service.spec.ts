import { EmailRetryService } from "../retry/email-retry.service";

describe("EmailRetryService", () => {
  it("returns the result on the first successful attempt without retrying", async () => {
    const retry = new EmailRetryService();
    const operation = jest.fn().mockResolvedValue("ok");

    const result = await retry.executeWithRetry(operation, { maxRetries: 3, retryDelayMs: 10, isRetryable: () => true, operationName: "test" });

    expect(result).toBe("ok");
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("retries a retryable failure with exponential backoff, then succeeds", async () => {
    jest.useFakeTimers();
    const retry = new EmailRetryService();
    const operation = jest.fn().mockRejectedValueOnce(new Error("fail")).mockResolvedValueOnce("ok");

    const promise = retry.executeWithRetry(operation, { maxRetries: 2, retryDelayMs: 100, isRetryable: () => true, operationName: "test" });
    await jest.advanceTimersByTimeAsync(200);

    await expect(promise).resolves.toBe("ok");
    expect(operation).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });

  it("does not retry a non-retryable failure and throws immediately", async () => {
    const retry = new EmailRetryService();
    const operation = jest.fn().mockRejectedValue(new Error("permanent"));

    await expect(retry.executeWithRetry(operation, { maxRetries: 3, retryDelayMs: 10, isRetryable: () => false, operationName: "test" })).rejects.toThrow("permanent");
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("exhausts maxRetries and throws the last error", async () => {
    jest.useFakeTimers();
    const retry = new EmailRetryService();
    const operation = jest.fn().mockRejectedValue(new Error("still failing"));

    const promise = retry.executeWithRetry(operation, { maxRetries: 2, retryDelayMs: 10, isRetryable: () => true, operationName: "test" });
    const assertion = expect(promise).rejects.toThrow("still failing");
    await jest.advanceTimersByTimeAsync(1000);
    await assertion;

    expect(operation).toHaveBeenCalledTimes(3); // initial + 2 retries
    jest.useRealTimers();
  });

  it("doubles the delay on each successive retry (exponential backoff)", async () => {
    jest.useFakeTimers();
    const retry = new EmailRetryService();
    const operation = jest.fn().mockRejectedValueOnce(new Error("1")).mockRejectedValueOnce(new Error("2")).mockResolvedValueOnce("ok");
    const sleepSpy = jest.spyOn(global, "setTimeout");

    const promise = retry.executeWithRetry(operation, { maxRetries: 3, retryDelayMs: 100, isRetryable: () => true, operationName: "test" });
    await jest.advanceTimersByTimeAsync(1000);
    await promise;

    const delays = sleepSpy.mock.calls.map((call) => call[1]);
    expect(delays).toEqual([100, 200]);
    jest.useRealTimers();
  });
});
