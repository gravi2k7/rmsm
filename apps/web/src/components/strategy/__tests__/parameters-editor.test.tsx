import { describe, expect, it } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ParametersEditor } from "../parameters-editor";
import type { StrategyParameterDefinition } from "@/types/strategy";

function ControlledEditor() {
  const [params, setParams] = useState<StrategyParameterDefinition[]>([]);
  return <ParametersEditor parameters={params} onChange={setParams} />;
}

describe("ParametersEditor", () => {
  it("shows an empty message with no parameters", () => {
    render(<ControlledEditor />);
    expect(screen.getByText(/No parameters defined yet/i)).toBeInTheDocument();
  });

  it("adds a parameter row on 'Add Parameter'", async () => {
    const user = userEvent.setup();
    render(<ControlledEditor />);

    await user.click(screen.getByRole("button", { name: /Add Parameter/i }));

    expect(screen.getByLabelText("Name")).toBeInTheDocument();
  });

  it("removes a parameter row when its remove action is used", async () => {
    const user = userEvent.setup();
    render(<ControlledEditor />);

    await user.click(screen.getByRole("button", { name: /Add Parameter/i }));
    expect(screen.getByLabelText("Name")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Remove parameter/i }));
    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
    expect(screen.getByText(/No parameters defined yet/i)).toBeInTheDocument();
  });

  it("updates the parameter name as the user types", async () => {
    const user = userEvent.setup();
    render(<ControlledEditor />);

    await user.click(screen.getByRole("button", { name: /Add Parameter/i }));
    await user.type(screen.getByLabelText("Name"), "lookback");

    expect(screen.getByLabelText("Name")).toHaveValue("lookback");
  });
});
