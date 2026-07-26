import { afterEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConsentProvider } from "@/components/providers/consent-provider";
import { CookieBanner } from "../cookie-banner";

function renderBanner() {
  return render(
    <ConsentProvider>
      <CookieBanner />
    </ConsentProvider>,
  );
}

describe("CookieBanner", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("shows Accept/Reject/Preferences when no decision has been made yet", async () => {
    renderBanner();
    expect(await screen.findByRole("button", { name: "Accept" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reject" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Preferences" })).toBeInTheDocument();
  });

  it("persists Accept to localStorage and hides the banner", async () => {
    const user = userEvent.setup();
    renderBanner();

    await user.click(await screen.findByRole("button", { name: "Accept" }));

    await waitFor(() => expect(screen.queryByRole("button", { name: "Accept" })).not.toBeInTheDocument());
    expect(window.localStorage.getItem("rmsm-cookie-consent")).toBe("accepted");
  });

  it("persists Reject to localStorage and hides the banner", async () => {
    const user = userEvent.setup();
    renderBanner();

    await user.click(await screen.findByRole("button", { name: "Reject" }));

    await waitFor(() => expect(screen.queryByRole("button", { name: "Reject" })).not.toBeInTheDocument());
    expect(window.localStorage.getItem("rmsm-cookie-consent")).toBe("rejected");
  });

  it("does not render once a decision was already persisted", () => {
    window.localStorage.setItem("rmsm-cookie-consent", "accepted");
    renderBanner();
    expect(screen.queryByRole("button", { name: "Accept" })).not.toBeInTheDocument();
  });

  it("expands category preferences without changing the consent decision", async () => {
    const user = userEvent.setup();
    renderBanner();

    await user.click(await screen.findByRole("button", { name: "Preferences" }));
    expect(screen.getByText("Necessary")).toBeInTheDocument();
    expect(screen.getByText("Always on")).toBeInTheDocument();
  });
});
