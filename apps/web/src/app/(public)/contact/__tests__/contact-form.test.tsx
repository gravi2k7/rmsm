import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ContactForm } from "../contact-form";

function renderForm() {
  return render(<ContactForm />);
}

describe("ContactForm (WM-010R)", () => {
  it("renders every required field with an accessible label", () => {
    renderForm();
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^company$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/job title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/business email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /^country$/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /organization size/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /^subject$/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^message$/i)).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /submit request/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reset/i })).toBeInTheDocument();
  });

  it("shows accessible required-field errors when submitting an empty form", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: /submit request/i }));

    const firstNameError = await screen.findByText(/first name is required/i);
    expect(firstNameError).toHaveAttribute("role", "alert");
    expect(screen.getByLabelText(/first name/i)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(/last name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/company is required/i)).toBeInTheDocument();
    expect(screen.getByText(/job title is required/i)).toBeInTheDocument();
    expect(screen.getByText(/business email is required/i)).toBeInTheDocument();
    expect(screen.getByText(/please select a country/i)).toBeInTheDocument();
    expect(screen.getByText(/please select an organization size/i)).toBeInTheDocument();
    expect(screen.getByText(/please select a subject/i)).toBeInTheDocument();
    expect(screen.getByText(/at least 20 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/must agree before submitting/i)).toBeInTheDocument();
  });

  it("validates business email format", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/business email/i), "not-an-email");
    await user.click(screen.getByRole("button", { name: /submit request/i }));

    expect(await screen.findByText(/enter a valid email address/i)).toBeInTheDocument();
  });

  it("submits successfully with valid data and resets the form", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/first name/i), "Jane");
    await user.type(screen.getByLabelText(/last name/i), "Trader");
    await user.type(screen.getByLabelText(/^company$/i), "Acme Capital");
    await user.type(screen.getByLabelText(/job title/i), "Head of Trading");
    await user.type(screen.getByLabelText(/business email/i), "jane@acme-capital.example");

    await user.click(screen.getByRole("combobox", { name: /^country$/i }));
    await user.click(await screen.findByRole("option", { name: /united states/i }));

    await user.click(screen.getByRole("combobox", { name: /organization size/i }));
    await user.click(await screen.findByRole("option", { name: /51/i }));

    await user.click(screen.getByRole("combobox", { name: /^subject$/i }));
    await user.click(await screen.findByRole("option", { name: /contact sales/i }));

    await user.type(screen.getByLabelText(/^message$/i), "We would like to discuss enterprise licensing for our trading desk.");
    await user.click(screen.getByRole("checkbox"));

    await user.click(screen.getByRole("button", { name: /submit request/i }));

    expect(await screen.findByText(/your request has been received/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText(/first name/i)).toHaveValue(""));
  });

  it("clears field values when Reset is clicked", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/first name/i), "Jane");
    expect(screen.getByLabelText(/first name/i)).toHaveValue("Jane");

    await user.click(screen.getByRole("button", { name: /reset/i }));

    expect(screen.getByLabelText(/first name/i)).toHaveValue("");
  });
});
