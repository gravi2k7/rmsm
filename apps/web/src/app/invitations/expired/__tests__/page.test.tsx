import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import InvitationExpiredPage from "../page";

describe("InvitationExpiredPage (WM-020E)", () => {
  it("explains the invitation is no longer valid and does not offer a self-service resend", () => {
    render(<InvitationExpiredPage />);
    expect(screen.getByText(/invitation expired/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /resend/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to login/i })).toBeInTheDocument();
  });
});
