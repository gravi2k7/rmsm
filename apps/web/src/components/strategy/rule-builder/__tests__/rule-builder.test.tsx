import { describe, expect, it } from "vitest";
import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RuleBuilder } from "../rule-builder";
import { createEmptyGroup } from "@/lib/rule-tree-mapper";
import type { RuleGroupNode } from "@/types/strategy";

function ControlledRuleBuilder() {
  const [tree, setTree] = useState<RuleGroupNode>(() => createEmptyGroup("AND"));
  return <RuleBuilder title="Entry" tree={tree} onChange={setTree} />;
}

describe("RuleBuilder", () => {
  it("shows an empty-state message with no rules", () => {
    render(<ControlledRuleBuilder />);
    expect(screen.getByText(/No conditions yet/i)).toBeInTheDocument();
  });

  it("adds a rule row when 'Rule' is clicked", async () => {
    const user = userEvent.setup();
    render(<ControlledRuleBuilder />);

    await user.click(screen.getByRole("button", { name: /^Rule$/i }));

    expect(screen.getByPlaceholderText("Rule label")).toBeInTheDocument();
  });

  it("adds a nested group when 'Group' is clicked", async () => {
    const user = userEvent.setup();
    render(<ControlledRuleBuilder />);

    await user.click(screen.getByRole("button", { name: /^Group$/i }));

    // The root group's own label plus the newly added nested group's label.
    expect(screen.getByText("Root group")).toBeInTheDocument();
    expect(screen.getByLabelText("Delete group")).toBeInTheDocument(); // only present on non-root groups
  });

  it("removes a rule when its delete action is used", async () => {
    const user = userEvent.setup();
    render(<ControlledRuleBuilder />);

    await user.click(screen.getByRole("button", { name: /^Rule$/i }));
    expect(screen.getByPlaceholderText("Rule label")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Delete rule/i }));
    expect(screen.queryByPlaceholderText("Rule label")).not.toBeInTheDocument();
    expect(screen.getByText(/No conditions yet/i)).toBeInTheDocument();
  });

  it("duplicates a rule, producing two rows with the same label", async () => {
    const user = userEvent.setup();
    render(<ControlledRuleBuilder />);

    await user.click(screen.getByRole("button", { name: /^Rule$/i }));
    const labelInput = screen.getByPlaceholderText("Rule label");
    await user.clear(labelInput);
    await user.type(labelInput, "Momentum check");

    await user.click(screen.getByRole("button", { name: /Duplicate rule/i }));

    const labelInputs = screen.getAllByDisplayValue("Momentum check");
    expect(labelInputs).toHaveLength(2);
  });

  it("toggles a rule's enabled switch", async () => {
    const user = userEvent.setup();
    render(<ControlledRuleBuilder />);

    await user.click(screen.getByRole("button", { name: /^Rule$/i }));
    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute("data-state", "checked");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("data-state", "unchecked");
  });

  it("changes the logical operator via the group select", async () => {
    render(<ControlledRuleBuilder />);
    const trigger = screen.getByLabelText("Group logical operator");
    expect(within(trigger).getByText("AND")).toBeInTheDocument();
  });
});
