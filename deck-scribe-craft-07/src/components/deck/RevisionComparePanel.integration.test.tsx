import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { SlideRevisionComparison } from "@/lib/slide-revision-generation";
import { RevisionComparePanel } from "./RevisionComparePanel";
import { hasUnintendedChangeRisk } from "./revision-compare-model";

describe("revision compare panel", () => {
  test("renders before after comparison and revision actions", () => {
    const markup = renderToStaticMarkup(
      <RevisionComparePanel
        comparison={comparison("kept")}
        onApproveRevision={() => undefined}
        onRequestRevision={() => undefined}
      />,
    );

    expect(markup.includes("기존 v1")).toBe(true);
    expect(markup.includes("수정본 v2")).toBe(true);
    expect(markup.includes("수정본 승인")).toBe(true);
    expect(markup.includes("재수정 요청")).toBe(true);
    expect(markup.includes("변경 요약")).toBe(true);
    expect(markup.includes("chart area size")).toBe(true);
  });

  test("shows unintended change risk when preservation checks fail", () => {
    const dirtyComparison = comparison("changed");
    const markup = renderToStaticMarkup(
      <RevisionComparePanel
        comparison={dirtyComparison}
        onApproveRevision={() => undefined}
        onRequestRevision={() => undefined}
      />,
    );

    expect(hasUnintendedChangeRisk(dirtyComparison)).toBe(true);
    expect(markup.includes("의도치 않은 변경 위험")).toBe(true);
    expect(markup.includes("source caption changed during revision.")).toBe(true);
  });

  test("omits risk warning for clean preservation checks", () => {
    const cleanComparison = comparison("kept");
    const markup = renderToStaticMarkup(
      <RevisionComparePanel
        comparison={cleanComparison}
        onApproveRevision={() => undefined}
        onRequestRevision={() => undefined}
      />,
    );

    expect(hasUnintendedChangeRisk(cleanComparison)).toBe(false);
    expect(markup.includes("의도치 않은 변경 위험")).toBe(false);
  });
});

function comparison(status: "kept" | "changed"): SlideRevisionComparison {
  return {
    slideNumber: 3,
    originalSlideVersion: 1,
    revisedSlideVersion: 2,
    beforeImageDescriptor: "original slide descriptor",
    afterImageDescriptor: "revised slide descriptor",
    requestedChanges: ["chart area size"],
    preservedTargets: ["title text", "source caption"],
    preservationChecks: [
      { target: "title text", status: "kept", message: "title text preserved." },
      {
        target: "source caption",
        status,
        message:
          status === "kept"
            ? "source caption preserved."
            : "source caption changed during revision.",
      },
    ],
    summary: "Slide 3 revision v2 keeps 2 targets and changes chart area size.",
  };
}
