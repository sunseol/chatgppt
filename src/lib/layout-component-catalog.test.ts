import { describe, expect, test } from "bun:test";
import {
  getLayoutComponentDefinition,
  isAllowedLayoutComponent,
  LayoutComponentDefinitionSchema,
  layoutComponentDefinitions,
  LayoutComponentTypeSchema,
  LayoutComponentTypes,
  selectLayoutComponentForSlide,
} from "./layout-component-catalog";
import { mockBrief, mockDesign, mockLayout, mockPlan, mockResearch } from "./mock-ai";
import type { DeckPlan } from "./deck-types";

const EXPECTED_COMPONENTS = [
  "CoverHero",
  "Agenda",
  "SectionDivider",
  "KeyMessage",
  "TwoColumn",
  "ChartWithInsight",
  "MetricCards",
  "ComparisonTable",
  "Timeline",
  "ImageWithCaption",
  "ClosingSummary",
];

describe("restricted layout component catalog", () => {
  test("contains exactly the approved component types", () => {
    expect(LayoutComponentTypes).toEqual(EXPECTED_COMPONENTS);
    expect(isAllowedLayoutComponent("FreeHtml")).toBe(false);
    expect(LayoutComponentTypeSchema.safeParse("FreeHtml").success).toBe(false);
  });

  test("validates every component definition with required slots and layer roles", () => {
    for (const definition of layoutComponentDefinitions()) {
      const parsed = LayoutComponentDefinitionSchema.safeParse(definition);

      expect(parsed.success).toBe(true);
      expect(definition.requiredSlots.length > 0).toBe(true);
      expect(definition.editableLayerRoles.length > 0).toBe(true);
      expect(definition.allowedTokenRefs.every(hasApprovedTokenNamespace)).toBe(true);
    }
  });

  test("selects only catalog components for mock layout output", () => {
    const brief = mockBrief("제한 컴포넌트 레이아웃 테스트", 8, "16:9");
    const research = mockResearch(brief);
    const plan = approvedPlan(mockPlan(brief, research));
    const design = mockDesign(brief, plan);
    const layout = mockLayout(plan, design);

    for (const slide of layout.slides) {
      expect(isAllowedLayoutComponent(slide.componentType)).toBe(true);
      const spec = plan.slides.find((candidate) => candidate.number === slide.number);
      expect(spec !== undefined).toBe(true);
      if (!spec) return;
      const selected = selectLayoutComponentForSlide(spec, slide.number - 1, plan.slides.length);
      const definition = getLayoutComponentDefinition(selected);
      expect(slide.componentType).toBe(definition.type);
      expect(
        slide.domLayers.every((layer) =>
          definition.editableLayerRoles.some((role) => role === layer.role),
        ),
      ).toBe(true);
    }
  });
});

function hasApprovedTokenNamespace(tokenRef: string): boolean {
  return (
    tokenRef.startsWith("color.") ||
    tokenRef.startsWith("typography.") ||
    tokenRef.startsWith("spacing.") ||
    tokenRef.startsWith("layout.")
  );
}

function approvedPlan(plan: DeckPlan): DeckPlan {
  return { ...plan, approvedHash: "sha256:approved-plan" };
}
