import { z } from "zod";
import type { SlideSpec } from "./deck-types";

export const LayoutComponentTypes = [
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
] as const;

export type LayoutComponentType = (typeof LayoutComponentTypes)[number];

export type LayoutLayerRole =
  | "title"
  | "subtitle"
  | "body"
  | "visual"
  | "chart"
  | "metric"
  | "table"
  | "image"
  | "caption"
  | "source"
  | "sectionMarker"
  | "cta";

export type LayoutSlot = {
  readonly id: string;
  readonly required: boolean;
};

export type LayoutComponentDefinition = {
  readonly type: LayoutComponentType;
  readonly requiredSlots: readonly LayoutSlot[];
  readonly editableLayerRoles: readonly LayoutLayerRole[];
  readonly allowedTokenRefs: readonly string[];
};

export const LayoutComponentTypeSchema = z.union([
  z.literal("CoverHero"),
  z.literal("Agenda"),
  z.literal("SectionDivider"),
  z.literal("KeyMessage"),
  z.literal("TwoColumn"),
  z.literal("ChartWithInsight"),
  z.literal("MetricCards"),
  z.literal("ComparisonTable"),
  z.literal("Timeline"),
  z.literal("ImageWithCaption"),
  z.literal("ClosingSummary"),
]);

export const LayoutLayerRoleSchema = z.union([
  z.literal("title"),
  z.literal("subtitle"),
  z.literal("body"),
  z.literal("visual"),
  z.literal("chart"),
  z.literal("metric"),
  z.literal("table"),
  z.literal("image"),
  z.literal("caption"),
  z.literal("source"),
  z.literal("sectionMarker"),
  z.literal("cta"),
]);

export const LayoutComponentDefinitionSchema = z.object({
  type: LayoutComponentTypeSchema,
  requiredSlots: z.array(z.object({ id: z.string().min(1), required: z.literal(true) })).min(1),
  editableLayerRoles: z.array(LayoutLayerRoleSchema).min(1),
  allowedTokenRefs: z.array(z.string().min(1)).min(1),
});

const DEFAULT_TOKEN_REFS = [
  "color.background",
  "color.textPrimary",
  "color.textSecondary",
  "color.primary",
  "color.accent",
  "typography.title",
  "typography.body",
  "typography.caption",
  "spacing.safeMargin",
  "layout.grid",
] as const;

export const LAYOUT_COMPONENT_CATALOG = {
  CoverHero: component(
    "CoverHero",
    ["title", "subtitle", "heroVisual"],
    ["title", "subtitle", "visual"],
  ),
  Agenda: component("Agenda", ["title", "items"], ["title", "body"]),
  SectionDivider: component(
    "SectionDivider",
    ["sectionTitle", "sectionMarker"],
    ["title", "sectionMarker"],
  ),
  KeyMessage: component(
    "KeyMessage",
    ["title", "message", "supportingPoint"],
    ["title", "body", "visual", "source"],
  ),
  TwoColumn: component(
    "TwoColumn",
    ["title", "leftColumn", "rightColumn"],
    ["title", "body", "visual", "source"],
  ),
  ChartWithInsight: component(
    "ChartWithInsight",
    ["title", "chart", "insight", "source"],
    ["title", "chart", "body", "source"],
  ),
  MetricCards: component(
    "MetricCards",
    ["title", "metrics", "source"],
    ["title", "metric", "body", "source"],
  ),
  ComparisonTable: component(
    "ComparisonTable",
    ["title", "table", "source"],
    ["title", "table", "source"],
  ),
  Timeline: component(
    "Timeline",
    ["title", "milestones", "source"],
    ["title", "visual", "body", "source"],
  ),
  ImageWithCaption: component(
    "ImageWithCaption",
    ["title", "image", "caption", "source"],
    ["title", "image", "caption", "source"],
  ),
  ClosingSummary: component(
    "ClosingSummary",
    ["title", "summary", "cta"],
    ["title", "body", "cta"],
  ),
} satisfies Record<LayoutComponentType, LayoutComponentDefinition>;

export function layoutComponentDefinitions(): readonly LayoutComponentDefinition[] {
  return LayoutComponentTypes.map((type) => LAYOUT_COMPONENT_CATALOG[type]);
}

export function getLayoutComponentDefinition(type: LayoutComponentType): LayoutComponentDefinition {
  return LAYOUT_COMPONENT_CATALOG[type];
}

export function isAllowedLayoutComponent(value: string): value is LayoutComponentType {
  return LayoutComponentTypeSchema.safeParse(value).success;
}

export function selectLayoutComponentForSlide(
  spec: SlideSpec,
  index: number,
  totalSlides: number,
): LayoutComponentType {
  if (index === 0) return "CoverHero";
  if (index === totalSlides - 1) return "ClosingSummary";
  if (/agenda|목차/i.test(spec.role) || /agenda|목차/i.test(spec.title)) return "Agenda";
  if (/section|divider|섹션/i.test(spec.role)) return "SectionDivider";
  if (/chart|차트|막대|그래프/i.test(spec.visualType)) return "ChartWithInsight";
  if (/metric|가격|지표|수치/i.test(spec.visualType)) return "MetricCards";
  if (/table|비교|표/i.test(spec.visualType)) return "ComparisonTable";
  if (/timeline|roadmap|타임라인|로드맵/i.test(spec.visualType)) return "Timeline";
  if (/image|사진|이미지/i.test(spec.visualType)) return "ImageWithCaption";
  if (/column|2열|투 컬럼/i.test(spec.visualType)) return "TwoColumn";
  return "KeyMessage";
}

function component(
  type: LayoutComponentType,
  slotIds: readonly string[],
  editableLayerRoles: readonly LayoutLayerRole[],
): LayoutComponentDefinition {
  return {
    type,
    requiredSlots: slotIds.map((id) => ({ id, required: true })),
    editableLayerRoles,
    allowedTokenRefs: DEFAULT_TOKEN_REFS,
  };
}
