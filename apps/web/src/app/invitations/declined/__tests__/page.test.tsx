import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import InvitationDeclinedPage from "../page";

describe("InvitationDeclinedPage (WM-020E)", () => {
  it("confirms the decline and links back to login", () => {
    render(<InvitationDeclinedPage />);
    expect(screen.getByText(/invitation declined/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to login/i })).toHaveAttribute("href", "/login");
  });
});
