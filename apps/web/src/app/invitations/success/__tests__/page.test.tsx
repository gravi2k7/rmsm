import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import InvitationSuccessPage from "../page";

describe("InvitationSuccessPage (WM-020E)", () => {
  it("confirms acceptance and links to the dashboard", () => {
    render(<InvitationSuccessPage />);
    expect(screen.getByText(/you're in/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /go to dashboard/i })).toHaveAttribute("href", "/dashboard");
  });
});
