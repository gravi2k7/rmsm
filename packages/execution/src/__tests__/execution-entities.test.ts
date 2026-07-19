import { describe, expect, it } from "vitest";
import { Execution } from "../entities/execution";
import { ExecutionPlan } from "../entities/execution-plan";
import { ExecutionSession } from "../entities/execution-session";
import { Fill } from "../entities/fill";
import { Quantity } from "../value-objects/quantity";
import { Price } from "../value-objects/price";
import { Commission } from "../value-objects/commission";
import { SymbolCode, CurrencyCode } from "@rmsm/market";

function symbol() {
  const r = SymbolCode.create("EURUSD");
  if (!r.ok) throw new Error("fixture failed");
  return r.value;
}
function quantity(units: number) {
  const r = Quantity.create(units);
  if (!r.ok) throw new Error("fixture failed");
  return r.value;
}

describe("Execution lifecycle", () => {
  it("starts IN_PROGRESS", () => {
    expect(Execution.start("e1", "o1", 3).status).toBe("IN_PROGRESS");
  });

  it("complete() raises ExecutionCompletedEvent", () => {
    const execution = Execution.start("e1", "o1", 3);
    execution.complete();
    expect(execution.status).toBe("COMPLETED");
    expect(execution.pullDomainEvents()[0]?.kind).toBe("ExecutionCompleted");
  });

  it("fail() raises ExecutionFailedEvent with the given reason", () => {
    const execution = Execution.start("e1", "o1", 3);
    execution.fail("broker rejected");
    expect(execution.status).toBe("FAILED");
    expect(execution.failureReason).toBe("broker rejected");
    const event = execution.pullDomainEvents()[0];
    expect(event?.kind).toBe("ExecutionFailed");
  });

  it("rejects any transition once terminal", () => {
    const execution = Execution.start("e1", "o1", 3);
    execution.complete();
    expect(() => execution.fail("x")).toThrow();
  });

  it("canRetry()/recordRetry() respect the maxRetries budget", () => {
    const execution = Execution.start("e1", "o1", 2);
    expect(execution.canRetry()).toBe(true);
    execution.recordRetry();
    execution.recordRetry();
    expect(execution.retryCount).toBe(2);
    expect(execution.canRetry()).toBe(false);
    expect(() => execution.recordRetry()).toThrow();
  });

  it("rejects a negative maxRetries", () => {
    expect(() => Execution.start("e1", "o1", -1)).toThrow();
  });
});

describe("ExecutionPlan", () => {
  it("exposes its own routing/splitting configuration", () => {
    const plan = ExecutionPlan.create("p1", {
      decisionId: "d1",
      symbolCode: symbol(),
      side: "BUY",
      orderType: "MARKET",
      totalQuantity: quantity(1000),
      splitStrategy: "TWAP",
      maxRetries: 3,
      timeoutMs: 5000,
    });
    expect(plan.splitStrategy).toBe("TWAP");
    expect(plan.totalQuantity.units).toBe(1000);
  });

  it("rejects a non-positive timeoutMs", () => {
    expect(() =>
      ExecutionPlan.create("p1", {
        decisionId: "d1",
        symbolCode: symbol(),
        side: "BUY",
        orderType: "MARKET",
        totalQuantity: quantity(1000),
        splitStrategy: "SINGLE",
        maxRetries: 3,
        timeoutMs: 0,
      }),
    ).toThrow();
  });
});

describe("ExecutionSession", () => {
  it("starts ACTIVE with no executions", () => {
    const session = ExecutionSession.open("s1");
    expect(session.status).toBe("ACTIVE");
    expect(session.executionCount).toBe(0);
  });

  it("addExecution() tracks execution ids", () => {
    const session = ExecutionSession.open("s1");
    session.addExecution("e1");
    session.addExecution("e2");
    expect(session.executionCount).toBe(2);
  });

  it("rejects adding an execution to a closed session", () => {
    const session = ExecutionSession.open("s1");
    session.close();
    expect(() => session.addExecution("e1")).toThrow();
  });

  it("close() sets status CLOSED and records endedAt", () => {
    const session = ExecutionSession.open("s1");
    session.close();
    expect(session.status).toBe("CLOSED");
    expect(session.endedAt).toBeDefined();
  });
});

describe("Fill", () => {
  it("rejects a non-positive quantity", () => {
    const currency = CurrencyCode.create("USD");
    const p = Price.create(1.1, 5);
    const q = Quantity.create(0);
    expect(currency.ok && p.ok && q.ok).toBe(true);
    if (currency.ok && p.ok && q.ok) {
      const commission = Commission.zero(currency.value);
      expect(() => Fill.create("f1", { orderId: "o1", price: p.value, quantity: q.value, commission, filledAt: new Date() })).toThrow();
    }
  });
});
