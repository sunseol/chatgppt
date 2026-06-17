import { describe, expect, test } from "bun:test";
import { generateDesignSystemFromPlan } from "./design-system-generator";
import { parseDesignSystem } from "./design-system";
import { mockBrief, mockPlan, mockResearch } from "./mock-ai";
import type { DeckPlan } from "./deck-types";

describe("design system generator", () => {
  test("returns one valid deck-wide design system when the deck plan is approved", () => {
    const brief = mockBrief("투자자용 AI 제작 워크플로우 피치덱", 8, "16:9");
    const research = mockResearch(brief);
    const plan = approvedPlan(mockPlan(brief, research));

    const result = generateDesignSystemFromPlan({ brief, plan });

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    const design = parseDesignSystem(result.design);
    const designSystemIds = new Set(result.slideRefs.map((ref) => ref.designSystemId));
    expect(designSystemIds.size).toBe(1);
    expect(designSystemIds.has(design.id)).toBe(true);
    expect(result.slideRefs.map((ref) => ref.slideNumber)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(design.negativeRules.includes("do not invent chart values")).toBe(true);
    expect(design.negativeRules.includes("do not use tiny unreadable text")).toBe(true);
    expect(design.negativeRules.includes("do not use random gradients")).toBe(true);
  });

  test("blocks generation when the deck plan has not been approved", () => {
    const brief = mockBrief("승인 전 디자인 생성 차단", 6, "4:3");
    const research = mockResearch(brief);
    const plan = mockPlan(brief, research);

    const result = generateDesignSystemFromPlan({ brief, plan });

    expect(result).toEqual({
      kind: "blocked",
      issues: ["Deck plan must be approved before generating the design system."],
    });
  });
});

function approvedPlan(plan: DeckPlan): DeckPlan {
  return { ...plan, approvedHash: "sha256:approved-plan" };
}
