import { OrganizationEventPublisher } from "../organization-event-publisher.service";

describe("OrganizationEventPublisher", () => {
  it("delivers a published event to a registered listener with the exact payload", () => {
    const publisher = new OrganizationEventPublisher();
    const listener = jest.fn();
    publisher.on("OrganizationCreated", listener);

    publisher.publish("OrganizationCreated", {
      organizationId: "org-1",
      actorId: "user-1",
      slug: "acme",
      name: "Acme",
    });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({
      organizationId: "org-1",
      actorId: "user-1",
      slug: "acme",
      name: "Acme",
    });
  });

  it("does not deliver an event to a listener registered for a different event name", () => {
    const publisher = new OrganizationEventPublisher();
    const listener = jest.fn();
    publisher.on("OrganizationArchived", listener);

    publisher.publish("OrganizationDeleted", { organizationId: "org-1", actorId: "user-1" });

    expect(listener).not.toHaveBeenCalled();
  });

  it("stops delivering events to a listener after off()", () => {
    const publisher = new OrganizationEventPublisher();
    const listener = jest.fn();
    publisher.on("OrganizationArchived", listener);
    publisher.off("OrganizationArchived", listener);

    publisher.publish("OrganizationArchived", { organizationId: "org-1", actorId: "user-1" });

    expect(listener).not.toHaveBeenCalled();
  });

  it("supports multiple independent listeners for the same event", () => {
    const publisher = new OrganizationEventPublisher();
    const first = jest.fn();
    const second = jest.fn();
    publisher.on("OrganizationOwnerTransferred", first);
    publisher.on("OrganizationOwnerTransferred", second);

    publisher.publish("OrganizationOwnerTransferred", {
      organizationId: "org-1",
      actorId: "owner-1",
      previousOwnerMembershipId: "m1",
      newOwnerMembershipId: "m2",
    });

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });
});
