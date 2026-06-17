import { z } from "zod";
import type { DeckPlan, DesignSystem, LayoutPrototype, SlideSpec } from "./deck-types";
import { enforceLayoutRendererSandbox } from "./layout-renderer-sandbox";
import {
  getLayoutComponentDefinition,
  LayoutComponentTypeSchema,
  LayoutLayerRoleSchema,
  selectLayoutComponentForSlide,
  type LayoutComponentType,
  type LayoutLayerRole,
} from "./layout-component-catalog";

const TokenRefSchema = z.string().regex(/^(color|typography|spacing|layout)\.[A-Za-z0-9.]+$/);

const BBoxPreferenceSchema = z
  .object({
    x: z.number().min(0),
    y: z.number().min(0),
    w: z.number().min(1),
    h: z.number().min(1),
  })
  .strict();

export const LayoutIRSlotSchema = z
  .object({
    id: z.string().min(1),
    role: LayoutLayerRoleSchema,
    text: z.string().optional(),
    sourceIds: z.array(z.string().min(1)),
    datasetIds: z.array(z.string().min(1)),
    tokenRefs: z.array(TokenRefSchema).min(1),
  })
  .strict();

export const LayoutIRLayerSchema = z
  .object({
    id: z.string().min(1),
    slotId: z.string().min(1),
    role: LayoutLayerRoleSchema,
    editable: z.boolean(),
    bboxPreference: BBoxPreferenceSchema,
  })
  .strict();

export const LayoutIRSlideSchema = z
  .object({
    id: z.string().min(1),
    slideNumber: z.number().int().min(1),
    componentType: LayoutComponentTypeSchema,
    metadata: z.object({ layoutPurpose: z.literal("draft") }).strict(),
    slots: z.array(LayoutIRSlotSchema).min(1),
    layers: z.array(LayoutIRLayerSchema).min(1),
  })
  .strict();

export const LayoutIRSchema = z
  .object({
    id: z.string().min(1),
    version: z.literal(1),
    designSystemId: z.string().min(1),
    canvas: z
      .object({
        ratio: z.union([z.literal("16:9"), z.literal("4:3")]),
        w: z.number().int().min(1),
        h: z.number().int().min(1),
        safeMargin: z.object({ x: z.number().int().min(1), y: z.number().int().min(1) }).strict(),
      })
      .strict(),
    slides: z.array(LayoutIRSlideSchema).min(1),
  })
  .strict();

export type LayoutIR = z.infer<typeof LayoutIRSchema>;
export type LayoutIRSlide = z.infer<typeof LayoutIRSlideSchema>;

export function createLayoutIrFromPlan(input: {
  readonly plan: DeckPlan;
  readonly design: DesignSystem;
}): LayoutIR {
  return LayoutIRSchema.parse({
    id: `layout_ir_${checksum(`${input.plan.id}|${input.design.id}`)}`,
    version: 1,
    designSystemId: input.design.id,
    canvas: input.design.canvas,
    slides: input.plan.slides.map((spec, index) =>
      createLayoutIrSlide(spec, index, input.plan.slides.length, input.design),
    ),
  });
}

export function renderLayoutIrToPrototype(ir: LayoutIR): LayoutPrototype {
  const parsed = LayoutIRSchema.parse(ir);
  return {
    id: `layout_${parsed.id}`,
    slides: parsed.slides.map((slide) => ({
      number: slide.slideNumber,
      componentType: slide.componentType,
      html: enforceLayoutRendererSandbox(renderSlideHtml(slide)),
      domLayers: slide.layers.map((layer) => createDomLayerMetadata(slide, layer)),
    })),
  };
}

function createLayoutIrSlide(
  spec: SlideSpec,
  index: number,
  totalSlides: number,
  design: DesignSystem,
): LayoutIRSlide {
  const componentType = selectLayoutComponentForSlide(spec, index, totalSlides);
  const definition = getLayoutComponentDefinition(componentType);
  const slots = definition.requiredSlots.map((slot) => ({
    id: slot.id,
    role: slotRole(slot.id, componentType),
    text: slotText(slot.id, spec),
    sourceIds: [...spec.evidence],
    datasetIds: (spec.dataSourceConstraints ?? []).filter((id) => id.startsWith("dataset_")),
    tokenRefs: [...definition.allowedTokenRefs],
  }));
  return LayoutIRSlideSchema.parse({
    id: `slide_${spec.number}`,
    slideNumber: spec.number,
    componentType,
    metadata: { layoutPurpose: "draft" },
    slots,
    layers: definition.editableLayerRoles.map((role) => ({
      id: `slide_${spec.number}_${role}`,
      slotId: slotIdForRole(role, slots),
      role,
      editable: true,
      bboxPreference: bboxForRole(role, design),
    })),
  });
}

function renderSlideHtml(slide: LayoutIRSlide): string {
  const layers = slide.layers
    .map((layer) => {
      const slot = findSlot(slide, layer.slotId);
      return `<div data-layer="${escapeHtml(layer.id)}" data-layer-id="${escapeHtml(
        layer.id,
      )}" data-slot-id="${escapeHtml(layer.slotId)}" data-role="${escapeHtml(
        layer.role,
      )}" data-layer-role="${escapeHtml(layer.role)}" data-source-id="${escapeHtml(
        slot.sourceIds.join(" "),
      )}" data-dataset-id="${escapeHtml(slot.datasetIds.join(" "))}" data-editable="${String(
        layer.editable,
      )}"></div>`;
    })
    .join("");
  return `<section data-layout-ir-slide="${escapeHtml(slide.id)}" data-component="${escapeHtml(
    slide.componentType,
  )}" data-layout-purpose="${slide.metadata.layoutPurpose}">${layers}</section>`;
}

function createDomLayerMetadata(slide: LayoutIRSlide, layer: LayoutIRSlide["layers"][number]) {
  const slot = findSlot(slide, layer.slotId);
  return {
    id: layer.id,
    role: layer.role,
    editable: layer.editable,
    sourceIds: [...slot.sourceIds],
    datasetIds: [...slot.datasetIds],
    bounds: layer.bboxPreference,
  };
}

function findSlot(slide: LayoutIRSlide, slotId: string): LayoutIRSlide["slots"][number] {
  const slot = slide.slots.find((candidate) => candidate.id === slotId);
  if (!slot) {
    throw new Error(`Missing Layout IR slot ${slotId} on ${slide.id}.`);
  }
  return slot;
}

function slotRole(slotId: string, componentType: LayoutComponentType): LayoutLayerRole {
  if (/chart/.test(slotId)) return "chart";
  if (/metric/.test(slotId)) return "metric";
  if (/table/.test(slotId)) return "table";
  if (/image/.test(slotId)) return "image";
  if (/caption/.test(slotId)) return "caption";
  if (/source/.test(slotId)) return "source";
  if (/cta/.test(slotId)) return "cta";
  if (/marker/.test(slotId) || componentType === "SectionDivider") return "sectionMarker";
  if (/subtitle/.test(slotId)) return "subtitle";
  if (/title/i.test(slotId)) return "title";
  return "body";
}

function slotText(slotId: string, spec: SlideSpec): string {
  if (/title/i.test(slotId)) return spec.title;
  if (/source/.test(slotId)) return spec.evidence.join(", ");
  if (/caption/.test(slotId)) return spec.visualComposition ?? spec.visualType;
  if (/cta/.test(slotId)) return spec.coreMessage;
  return spec.bodyPoints?.join(" · ") ?? spec.coreMessage;
}

function slotIdForRole(
  role: LayoutLayerRole,
  slots: readonly z.infer<typeof LayoutIRSlotSchema>[],
): string {
  return slots.find((slot) => slot.role === role)?.id ?? slots[0]?.id ?? role;
}

function bboxForRole(role: LayoutLayerRole, design: DesignSystem) {
  const margin = design.canvas.safeMargin;
  if (role === "title") {
    return { x: margin.x, y: margin.y, w: design.canvas.w - margin.x * 2, h: 140 };
  }
  if (role === "source") {
    return {
      x: margin.x,
      y: design.canvas.h - 112,
      w: design.canvas.w - margin.x * 2,
      h: 40,
    };
  }
  return {
    x: margin.x,
    y: margin.y + 180,
    w: design.canvas.w - margin.x * 2,
    h: design.canvas.h - margin.y * 2 - 260,
  };
}

function checksum(value: string): string {
  return Math.abs([...value].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) | 0, 7))
    .toString(16)
    .padStart(8, "0");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
