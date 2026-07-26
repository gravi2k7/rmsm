import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Zap } from "lucide-react";
import { IconCard } from "../icon-card";

describe("IconCard", () => {
  it("renders the title and description built on @rmsm/ui's Card", () => {
    render(<IconCard icon={Zap} title="Fast" description="Sub-millisecond execution." />);
    expect(screen.getByText("Fast")).toBeInTheDocument();
    expect(screen.getByText("Sub-millisecond execution.")).toBeInTheDocument();
  });
});
