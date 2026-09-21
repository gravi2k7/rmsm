import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { OrganizationBootstrap } from "../organization-bootstrap";
import { useOrganizationStore } from "@/lib/organization-store";
import { useSessionStore } from "@/lib/session-store";

const mockListOrganizations = vi.fn();

vi.mock("@/features/organizations/api", () => ({
  listOrganizations: (...args: unknown[]) =>
    mockListOrganizations(...args),
}));

function renderBootstrap() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <OrganizationBootstrap />
    </QueryClientProvider>,
  );
}

describe("OrganizationBootstrap", () => {
  beforeEach(() => {
    useOrganizationStore.setState({
      activeOrganization: null,
      availableOrganizations: [],
    });

    useSessionStore.setState({
      organizationId: null,
      accessToken: "session-token",
    });

    mockListOrganizations.mockResolvedValue({
      items: [
        {
          id: "org-1",
          name: "RMSM",
          slug: "rmsm",
        },
      ],
      total: 1,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("bootstraps the authenticated user's organization", async () => {
    renderBootstrap();

    await waitFor(() => {
      expect(
        useOrganizationStore.getState().activeOrganization?.id,
      ).toBe("org-1");

      expect(
        useOrganizationStore.getState().availableOrganizations.map(
          (organization) => organization.id,
        ),
      ).toEqual(["org-1"]);

      expect(
        useSessionStore.getState().organizationId,
      ).toBe("org-1");
    });
  });

  it("preserves a valid persisted organization", async () => {
    useSessionStore.getState().setOrganizationId("org-2");

    mockListOrganizations.mockResolvedValue({
      items: [
        {
          id: "org-1",
          name: "RMSM",
          slug: "rmsm",
        },
        {
          id: "org-2",
          name: "Second Org",
          slug: "second-org",
        },
      ],
      total: 2,
    });

    renderBootstrap();

    await waitFor(() => {
      expect(
        useOrganizationStore.getState().activeOrganization?.id,
      ).toBe("org-2");
    });

    expect(
      useSessionStore.getState().organizationId,
    ).toBe("org-2");
  });

  it("falls back to the first organization when persisted organization is invalid", async () => {
    useSessionStore.getState().setOrganizationId("missing-org");

    mockListOrganizations.mockResolvedValue({
      items: [
        {
          id: "org-1",
          name: "RMSM",
          slug: "rmsm",
        },
        {
          id: "org-2",
          name: "Second Org",
          slug: "second-org",
        },
      ],
      total: 2,
    });

    renderBootstrap();

    await waitFor(() => {
      expect(
        useOrganizationStore.getState().activeOrganization?.id,
      ).toBe("org-1");

      expect(
        useSessionStore.getState().organizationId,
      ).toBe("org-1");
    });
  });

  it("clears organization context when the user has no organizations", async () => {
    useOrganizationStore.getState().setActiveOrganization({
      id: "old-org",
      name: "Old Org",
      slug: "old-org",
    });
    useOrganizationStore.getState().setAvailableOrganizations([
      {
        id: "old-org",
        name: "Old Org",
        slug: "old-org",
      },
    ]);
    useSessionStore.getState().setOrganizationId("old-org");

    mockListOrganizations.mockResolvedValue({
      items: [],
      total: 0,
    });

    renderBootstrap();

    await waitFor(() => {
      expect(
        useOrganizationStore.getState().activeOrganization,
      ).toBeNull();

      expect(
        useOrganizationStore.getState().availableOrganizations,
      ).toEqual([]);
    });
  });
});
