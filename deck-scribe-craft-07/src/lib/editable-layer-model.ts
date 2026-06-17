import { z } from "zod";

export const EditableLayerTypeSchema = z.union([
  z.literal("text"),
  z.literal("shape"),
  z.literal("image"),
  z.literal("chart"),
]);

export const EditabilityQualityLevelSchema = z.union([z.literal("level2"), z.literal("level3")]);

export type EditabilityQualityLevel = z.infer<typeof EditabilityQualityLevelSchema>;

export const EDITABILITY_QUALITY_LEVELS = {
  level2: "DOM metadata driven editable overlays for text, sources, metrics, and charts.",
  level3: "Advanced object matching with movable visual regions and richer object separation.",
} satisfies Record<EditabilityQualityLevel, string>;

export const EditableBoundsSchema = z
  .object({
    x: z.number().min(0),
    y: z.number().min(0),
    w: z.number().min(1),
    h: z.number().min(1),
  })
  .strict();

export const MvpEditableLayerSchema = z
  .object({
    id: z.string().min(1),
    sourceLayerId: z.string().min(1),
    type: EditableLayerTypeSchema,
    role: z.string().min(1),
    bounds: EditableBoundsSchema,
    editable: z.boolean(),
    text: z.string().optional(),
    sourceIds: z.array(z.string().min(1)),
    datasetIds: z.array(z.string().min(1)),
    sourceMapIds: z.array(z.string().min(1)),
    qualityLevel: EditabilityQualityLevelSchema,
    chartOverlayId: z.string().min(1).optional(),
  })
  .strict();

export const MvpEditableLayerModelSchema = z
  .object({
    slideNumber: z.number().int().min(1),
    layers: z.array(MvpEditableLayerSchema),
  })
  .strict();

export type MvpEditableLayer = z.infer<typeof MvpEditableLayerSchema>;
export type MvpEditableLayerModel = z.infer<typeof MvpEditableLayerModelSchema>;
