import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SignupPage from "../page";

function renderPage() {
  return render(<SignupPage />);
}

describe("SignupPage (WM-020A)", () => {
  it("renders the hero, every required field with an accessible label, and the primary CTA", () => {
    renderPage();

    // `CardTitle` renders an `<h3>` (see `@rmsm/ui`'s `card.tsx`) — matches
    // the same heading level already used by /login, /forgot-password, and
    // /reset-password's `CardTitle`s, kept consistent rather than
    // introducing a one-off `<h1>` on just this page.
    expect(screen.getByRole("heading", { level: 3, name: /create your rmsm workspace/i })).toBeInTheDocument();
    expect(screen.getByText(/start your free enterprise trial/i)).toBeInTheDocument();

    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/business email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/company name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/terms of service/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/product news and platform updates/i)).toBeInTheDocument();

    expect(screen.getByRole("button", { name: /create workspace/i })).toBeInTheDocument();
  });

  it("links 'Already have an account? Login' to /login", () => {
    renderPage();
    expect(screen.getByRole("link", { name: "Login" })).toHaveAttribute("href", "/login");
  });

  it("shows accessible required-field errors when submitting an empty form", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /create workspace/i }));

    const firstNameError = await screen.findByText(/first name is required/i);
    expect(firstNameError).toHaveAttribute("role", "alert");
    expect(screen.getByLabelText(/first name/i)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(/last name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/business email is required/i)).toBeInTheDocument();
    expect(screen.getByText(/company name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/password must be at least 12 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/must accept the terms of service/i)).toBeInTheDocument();
  });

  it("validates business email format", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/business email/i), "not-an-email");
    await user.click(screen.getByRole("button", { name: /create workspace/i }));

    expect(await screen.findByText(/enter a valid business email address/i)).toBeInTheDocument();
  });

  it("requires the password confirmation to match", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/^password$/i), "correcthorsebattery1");
    await user.type(screen.getByLabelText(/confirm password/i), "somethingelse123456");
    await user.click(screen.getByRole("button", { name: /create workspace/i }));

    expect(await screen.findByText(/passwords don't match/i)).toBeInTheDocument();
  });

  it("requires the terms checkbox before submitting", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/first name/i), "Jane");
    await user.type(screen.getByLabelText(/last name/i), "Trader");
    await user.type(screen.getByLabelText(/business email/i), "jane@acme-capital.example");
    await user.type(screen.getByLabelText(/company name/i), "Acme Capital");
    await user.type(screen.getByLabelText(/^password$/i), "correcthorsebattery1");
    await user.type(screen.getByLabelText(/confirm password/i), "correcthorsebattery1");
    await user.click(screen.getByRole("button", { name: /create workspace/i }));

    expect(await screen.findByText(/must accept the terms of service/i)).toBeInTheDocument();
  });

  it("shows a live password strength indicator that updates as the user types", async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.queryByText(/password strength/i)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/^password$/i), "abc");
    expect(await screen.findByText(/password strength/i)).toBeInTheDocument();
    expect(screen.getByText(/very weak/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/^password$/i), "defGHIjkl123!@#456");
    expect(await screen.findByText(/strong/i)).toBeInTheDocument();
  });

  it("submits successfully with valid data and resets the form", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/first name/i), "Jane");
    await user.type(screen.getByLabelText(/last name/i), "Trader");
    await user.type(screen.getByLabelText(/business email/i), "jane@acme-capital.example");
    await user.type(screen.getByLabelText(/company name/i), "Acme Capital");
    await user.type(screen.getByLabelText(/^password$/i), "correcthorsebattery1");
    await user.type(screen.getByLabelText(/confirm password/i), "correcthorsebattery1");
    await user.click(screen.getByLabelText(/terms of service/i));

    await user.click(screen.getByRole("button", { name: /create workspace/i }));

    expect(await screen.findByText(/workspace request has been received/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByLabelText(/first name/i)).not.toBeInTheDocument());
  });
});
