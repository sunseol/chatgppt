import { describe, expect, test } from "bun:test";
import {
  createLayoutIrFromPlan,
  LayoutIRSchema,
  LayoutIRSlideSchema,
  renderLayoutIrToPrototype,
} from "./layout-ir";
import { isAllowedLayoutComponent } from "./layout-component-catalog";
import { mockBrief, mockDesign, mockLayout, mockPlan, mockResearch } from "./mock-ai";
import type { DeckPlan } from "./deck-types";

describe("layout IR schema and deterministic renderer contract", () => {
  test("creates valid Layout IR from an approved plan and design system", () => {
    const { plan, design } = fixture();

    const ir = createLayoutIrFromPlan({ plan, design });
    const parsed = LayoutIRSchema.safeParse(ir);

    expect(parsed.success).toBe(true);
    expect(ir.slides.length).toBe(plan.slides.length);
    expect(ir.slides.every((slide) => isAllowedLayoutComponent(slide.componentType))).toBe(true);
    expect(ir.slides.every((slide) => slide.metadata.layoutPurpose === "draft")).toBe(true);
  });

  test("rejects unknown components, unknown keys, and arbitrary style surfaces", () => {
    const { plan, design } = fixture();
    const ir = createLayoutIrFromPlan({ plan, design });
    const slide = firstSlide(ir);
    const slot = firstSlot(slide);

    expect(
      LayoutIRSlideSchema.safeParse({
        ...slide,
        componentType: "FreeHtml",
      }).success,
    ).toBe(false);
    expect(
      LayoutIRSchema.safeParse({
        ...ir,
        slides: [{ ...slide, css: ".title { color: red; }" }],
      }).success,
    ).toBe(false);
    expect(
      LayoutIRSchema.safeParse({
        ...ir,
        slides: [
          {
            ...slide,
            slots: [{ ...slot, style: { color: "#ff0000", fontFamily: "RemoteFont" } }],
          },
        ],
      }).success,
    ).toBe(false);
  });

  test("renders Layout IR to traceable LayoutPrototype metadata", () => {
    const { plan, design } = fixture();
    const ir = createLayoutIrFromPlan({ plan, design });

    const prototype = renderLayoutIrToPrototype(ir);

    expect(prototype.slides.length).toBe(ir.slides.length);
    expect(allDomLayerIds(prototype)).toEqual(allIrLayerIds(ir));
    expect(prototype.slides.every((slide) => !slide.html.includes("<script"))).toBe(true);
    expect(prototype.slides.every((slide) => !slide.html.includes("style="))).toBe(true);
    expect(prototype.slides.every((slide) => !slide.html.includes("http"))).toBe(true);
  });

  test("mock layout generation uses Layout IR renderer output", () => {
    const { plan, design } = fixture();

    const layout = mockLayout(plan, design);

    expect(layout.slides.every((slide) => isAllowedLayoutComponent(slide.componentType))).toBe(
      true,
    );
    expect(layout.slides.every((slide) => slide.html.includes("data-layout-ir-slide"))).toBe(true);
  });
});

function fixture() {
  const brief = mockBrief("Layout IR pitch deck", 8, "16:9");
  const research = mockResearch(brief);
  const plan = approvedPlan(mockPlan(brief, research));
  const design = mockDesign(brief, plan);
  return { plan, design };
}

function approvedPlan(plan: DeckPlan): DeckPlan {
  return { ...plan, approvedHash: "sha256:approved-plan" };
}

function firstSlide(ir: ReturnType<typeof createLayoutIrFromPlan>) {
  const slide = ir.slides[0];
  if (!slide) throw new Error("Expected Layout IR to contain at least one slide.");
  return slide;
}

function firstSlot(slide: ReturnType<typeof firstSlide>) {
  const slot = slide.slots[0];
  if (!slot) throw new Error("Expected Layout IR slide to contain at least one slot.");
  return slot;
}

function allIrLayerIds(ir: ReturnType<typeof createLayoutIrFromPlan>): string[] {
  return ir.slides.flatMap((slide) => slide.layers.map((layer) => layer.id)).sort();
}

function allDomLayerIds(prototype: ReturnType<typeof renderLayoutIrToPrototype>): string[] {
  return prototype.slides.flatMap((slide) => slide.domLayers.map((layer) => layer.id)).sort();
}
