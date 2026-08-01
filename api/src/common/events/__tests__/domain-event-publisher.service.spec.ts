import { DomainEventPublisher } from "../domain-event-publisher.service";

describe("DomainEventPublisher", () => {
  it("delivers a published event to a registered listener with the exact payload", () => {
    const publisher = new DomainEventPublisher();
    const listener = jest.fn();
    publisher.on("user.created", listener);

    publisher.publish("user.created", { userId: "u-1", actorId: "admin-1" });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ userId: "u-1", actorId: "admin-1" });
  });

  it("does not deliver an event to a listener registered for a different event name", () => {
    const publisher = new DomainEventPublisher();
    const listener = jest.fn();
    publisher.on("role.created", listener);

    publisher.publish("role.updated", { roleId: "r-1" });

    expect(listener).not.toHaveBeenCalled();
  });

  it("stops delivering events to a listener after off()", () => {
    const publisher = new DomainEventPublisher();
    const listener = jest.fn();
    publisher.on("session.revoked", listener);
    publisher.off("session.revoked", listener);

    publisher.publish("session.revoked", { sessionId: "s-1" });

    expect(listener).not.toHaveBeenCalled();
  });

  it("supports many listeners across many event names without exceeding the default EventEmitter limit", () => {
    const publisher = new DomainEventPublisher();
    const listeners = Array.from({ length: 20 }, () => jest.fn());
    listeners.forEach((l) => publisher.on("audit.created", l));

    publisher.publish("audit.created", { auditLogId: "a-1" });

    listeners.forEach((l) => expect(l).toHaveBeenCalledTimes(1));
  });

  it("is a distinct instance per construction (not a module-level singleton EventEmitter)", () => {
    const first = new DomainEventPublisher();
    const second = new DomainEventPublisher();
    const listener = jest.fn();
    first.on("password.reset", listener);

    second.publish("password.reset", { userId: "u-2" });

    expect(listener).not.toHaveBeenCalled();
  });
});
