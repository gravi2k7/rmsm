import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StrategyStatusBadge, VersionStatusBadge, ApprovalDecisionBadge } from "../status-badges";

describe("StrategyStatusBadge", () => {
  it("renders the ACTIVE status text", () => {
    render(<StrategyStatusBadge status="ACTIVE" />);
    expect(screen.getByText("ACTIVE")).toBeInTheDocument();
  });

  it("renders the ARCHIVED status text", () => {
    render(<StrategyStatusBadge status="ARCHIVED" />);
    expect(screen.getByText("ARCHIVED")).toBeInTheDocument();
  });
});

describe("VersionStatusBadge", () => {
  it("renders underscored statuses with spaces for readability", () => {
    render(<VersionStatusBadge status="PENDING_APPROVAL" />);
    expect(screen.getByText("PENDING APPROVAL")).toBeInTheDocument();
  });
});

describe("ApprovalDecisionBadge", () => {
  it("renders each decision value", () => {
    const { rerender } = render(<ApprovalDecisionBadge decision="PENDING" />);
    expect(screen.getByText("PENDING")).toBeInTheDocument();
    rerender(<ApprovalDecisionBadge decision="APPROVED" />);
    expect(screen.getByText("APPROVED")).toBeInTheDocument();
    rerender(<ApprovalDecisionBadge decision="REJECTED" />);
    expect(screen.getByText("REJECTED")).toBeInTheDocument();
  });
});
