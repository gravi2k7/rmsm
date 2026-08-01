// OrganizationRepository imports the real `prisma` singleton as its
// default `client` parameter, but every test below passes an explicit
// mock client, so the import just needs to not throw at module-load time
// (same reasoning as membership.controller.spec.ts's @rmsm/database mock).
jest.mock("@rmsm/database", () => ({ prisma: {} }));

import { OrganizationRepository } from "../organization.repository";
import type { DbClient } from "@rmsm/database";

describe("OrganizationRepository — Module 003 field wiring", () => {
  function buildClientMock() {
    return {
      organization: {
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
      },
    } as unknown as DbClient;
  }

  it("create() passes every Module 003 profile field through to Prisma", async () => {
    const client = buildClientMock();
    const repository = new OrganizationRepository();

    await repository.create(
      {
        name: "Acme",
        slug: "acme",
        createdById: "user-1",
        displayName: "Acme Inc.",
        email: "hello@acme.test",
        phone: "+1-555-0100",
        addressLine1: "1 Market St",
        addressLine2: "Suite 400",
        city: "San Francisco",
        state: "CA",
        postalCode: "94105",
        locale: "en-GB",
      },
      client,
    );

    expect(client.organization.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          displayName: "Acme Inc.",
          email: "hello@acme.test",
          phone: "+1-555-0100",
          addressLine1: "1 Market St",
          addressLine2: "Suite 400",
          city: "San Francisco",
          state: "CA",
          postalCode: "94105",
          locale: "en-GB",
        }),
      }),
    );
  });

  it("create() round-trips `settings` through JSON (dedup'd @rmsm/shared toInputJsonValue) exactly as before", async () => {
    const client = buildClientMock();
    const repository = new OrganizationRepository();

    await repository.create({ name: "Acme", slug: "acme", settings: { branding: { primaryColor: "#000" } } }, client);

    const call = (client.organization.create as jest.Mock).mock.calls[0][0];
    expect(call.data.settings).toEqual({ branding: { primaryColor: "#000" } });
  });

  it("updateDetails() passes Module 003 profile fields through as a partial update", async () => {
    const client = buildClientMock();
    const repository = new OrganizationRepository();

    await repository.updateDetails("org-1", { displayName: "New Name", locale: "fr-FR" }, "actor-1", client);

    expect(client.organization.update).toHaveBeenCalledWith({
      where: { id: "org-1" },
      data: expect.objectContaining({
        displayName: "New Name",
        locale: "fr-FR",
        updatedById: "actor-1",
      }),
    });
  });

  it("updateDetails() leaves settings untouched (undefined) when not provided in the partial update", async () => {
    const client = buildClientMock();
    const repository = new OrganizationRepository();

    await repository.updateDetails("org-1", { name: "New Name" }, "actor-1", client);

    const call = (client.organization.update as jest.Mock).mock.calls[0][0];
    expect(call.data.settings).toBeUndefined();
  });
});
