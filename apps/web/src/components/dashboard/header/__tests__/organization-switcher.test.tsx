import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { OrganizationSwitcher } from "../organization-switcher";
import { useOrganizationStore } from "@/lib/organization-store";
import { useSessionStore } from "@/lib/session-store";

const mockListOrganizations = vi.fn();

vi.mock("@/features/organizations/api", () => ({
  listOrganizations: (...args: unknown[]) =>
    mockListOrganizations(...args),
}));

function renderSwitcher() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <OrganizationSwitcher />
    </QueryClientProvider>,
  );
}

describe("OrganizationSwitcher", () => {
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

  it("loads the authenticated user's organization and bridges it to the session", async () => {
    renderSwitcher();

    expect(
      await screen.findByRole("button", {
        name: "Switch organization",
      }),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(
        useOrganizationStore.getState().activeOrganization?.id,
      ).toBe("org-1");

      expect(
        useSessionStore.getState().organizationId,
      ).toBe("org-1");
    });

    expect(
      screen.getByText("RMSM"),
    ).toBeInTheDocument();
  });

  it("switches the active organization and updates the session organization", async () => {
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

    const user = userEvent.setup();

    renderSwitcher();

    const switcher = await screen.findByRole(
      "button",
      {
        name: "Switch organization",
      },
    );

    await user.click(switcher);

    expect(switcher).toHaveAttribute(
      "aria-expanded",
      "true",
    );

    await user.click(
      await screen.findByRole("menuitem", {
        name: "Second Org",
      }),
    );

    await waitFor(() => {
      expect(
        useOrganizationStore.getState().activeOrganization?.id,
      ).toBe("org-2");

      expect(
        useSessionStore.getState().organizationId,
      ).toBe("org-2");
    });
  });
});
