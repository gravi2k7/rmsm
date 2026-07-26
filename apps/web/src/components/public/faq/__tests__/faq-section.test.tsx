import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FAQSection } from "../faq-section";

describe("FAQSection / FAQItem", () => {
  const items = [
    { question: "What is RMSM?", answer: "An institutional trading platform." },
    { question: "Is there a free trial?", answer: "Reach out to sales." },
  ];

  it("renders every question, collapsed by default", () => {
    render(<FAQSection items={items} />);
    for (const item of items) {
      expect(screen.getByText(item.question)).toBeInTheDocument();
    }
    // Native <details> keeps its content in the DOM even when collapsed
    // (that's real browser behavior, not a jsdom quirk) — it's just not
    // visible, so this checks visibility rather than presence.
    expect(screen.getByText("An institutional trading platform.")).not.toBeVisible();
  });

  it("opens on click via native <details>/<summary>, exposing the answer", async () => {
    const user = userEvent.setup();
    render(<FAQSection items={items} />);

    await user.click(screen.getByText("What is RMSM?"));

    expect(screen.getByText("An institutional trading platform.")).toBeVisible();
  });

  it("supports rendering a section already open via defaultOpen", () => {
    render(<FAQSection items={[{ ...items[0]!, defaultOpen: true }]} />);
    expect(screen.getByText("An institutional trading platform.")).toBeVisible();
  });
});
