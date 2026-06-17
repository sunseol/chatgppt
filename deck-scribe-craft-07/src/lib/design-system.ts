import { z } from "zod";
import type { ArtifactRecord } from "./artifacts";
import { createArtifactRecord } from "./artifacts";
import type { DesignSystem } from "./deck-types";

const HexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/);

const TypographyRuleSchema = z
  .object({
    style: z.string().min(1),
    minPx: z.number().int().min(12),
    maxPx: z.number().int().min(12),
  })
  .superRefine((rule, context) => {
    if (rule.maxPx < rule.minPx) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["maxPx"],
        message: "Typography maxPx must be greater than or equal to minPx.",
      });
    }
  });

export const DesignSystemSchema = z.object({
  id: z.string().min(1),
  canvas: z.object({
    ratio: z.union([z.literal("16:9"), z.literal("4:3")]),
    w: z.number().int().min(1),
    h: z.number().int().min(1),
    safeMargin: z.object({
      x: z.number().int().min(1),
      y: z.number().int().min(1),
    }),
  }),
  grid: z.object({
    columns: z.number().int().min(1),
    gutter: z.number().int().min(0),
  }),
  colors: z.object({
    background: HexColorSchema,
    textPrimary: HexColorSchema,
    textSecondary: HexColorSchema,
    primary: HexColorSchema,
    secondary: HexColorSchema,
    accent: HexColorSchema,
  }),
  typography: z.object({
    titleStyle: z.string().min(1),
    bodyStyle: z.string().min(1),
    title: TypographyRuleSchema,
    body: TypographyRuleSchema,
    caption: TypographyRuleSchema,
    number: TypographyRuleSchema,
  }),
  layoutRules: z.array(z.string().min(1)).min(1),
  componentRules: z.array(z.string().min(1)).min(1),
  visualLanguage: z.string().min(1),
  negativeRules: z.array(z.string().min(1)).min(1),
  approvedHash: z.string().optional(),
});

export interface ApproveDesignSystemInput {
  readonly projectId: string;
  readonly design: DesignSystem;
  readonly version: number;
  readonly approvedAt: number;
}

export interface ApprovedDesignSystemArtifact {
  readonly record: ArtifactRecord;
  readonly design: ImmutableDesignSystem;
}

export type ImmutableDesignSystem = ReturnType<typeof freezeDesignSystem>;

export function parseDesignSystem(input: unknown): DesignSystem {
  return DesignSystemSchema.parse(input);
}

export function createApprovedDesignSystemArtifact(
  input: ApproveDesignSystemInput,
): ApprovedDesignSystemArtifact {
  const design = freezeDesignSystem(parseDesignSystem(input.design));
  const record = createArtifactRecord({
    projectId: input.projectId,
    type: "design",
    version: input.version,
    content: JSON.stringify(design),
    createdAt: input.approvedAt,
  });
  return Object.freeze({ record, design });
}

function freezeDesignSystem(design: DesignSystem) {
  return Object.freeze({
    ...design,
    canvas: Object.freeze({
      ...design.canvas,
      safeMargin: Object.freeze({ ...design.canvas.safeMargin }),
    }),
    grid: Object.freeze({ ...design.grid }),
    colors: Object.freeze({ ...design.colors }),
    typography: Object.freeze({
      titleStyle: design.typography.titleStyle,
      bodyStyle: design.typography.bodyStyle,
      title: Object.freeze({ ...design.typography.title }),
      body: Object.freeze({ ...design.typography.body }),
      caption: Object.freeze({ ...design.typography.caption }),
      number: Object.freeze({ ...design.typography.number }),
    }),
    layoutRules: Object.freeze([...design.layoutRules]),
    componentRules: Object.freeze([...design.componentRules]),
    negativeRules: Object.freeze([...design.negativeRules]),
  });
}
