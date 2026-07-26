import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Zap } from "lucide-react";
import { IconWrapper } from "../icon-wrapper";

describe("IconWrapper", () => {
  it("renders the given icon as decorative by default", () => {
    const { container } = render(<IconWrapper icon={Zap} />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("exposes an accessible label when one is provided instead of hiding the icon", () => {
    render(<IconWrapper icon={Zap} label="Fast execution" />);
    expect(screen.getByLabelText("Fast execution")).toBeInTheDocument();
  });
});
