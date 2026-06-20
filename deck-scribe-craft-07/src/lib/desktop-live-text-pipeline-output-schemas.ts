const HexColorOutputSchema = {
  type: "string",
  pattern: "^#[0-9A-Fa-f]{6}$",
} as const;

const StringArrayOutputSchema = {
  type: "array",
  items: { type: "string" },
} as const;

const PositiveIntegerOutputSchema = {
  type: "integer",
  minimum: 1,
} as const;

const TypographyRuleOutputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["style", "minPx", "maxPx"],
  properties: {
    style: { type: "string", minLength: 1 },
    minPx: { type: "integer", minimum: 12 },
    maxPx: { type: "integer", minimum: 12 },
  },
} as const;

const CanvasOutputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["ratio", "w", "h", "safeMargin"],
  properties: {
    ratio: { type: "string", enum: ["16:9", "4:3"] },
    w: PositiveIntegerOutputSchema,
    h: PositiveIntegerOutputSchema,
    safeMargin: {
      type: "object",
      additionalProperties: false,
      required: ["x", "y"],
      properties: {
        x: PositiveIntegerOutputSchema,
        y: PositiveIntegerOutputSchema,
      },
    },
  },
} as const;

export const DesignSystemOutputSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "id",
    "canvas",
    "grid",
    "colors",
    "typography",
    "layoutRules",
    "componentRules",
    "visualLanguage",
    "negativeRules",
  ],
  properties: {
    id: { type: "string", minLength: 1 },
    canvas: CanvasOutputSchema,
    grid: {
      type: "object",
      additionalProperties: false,
      required: ["columns", "gutter"],
      properties: {
        columns: PositiveIntegerOutputSchema,
        gutter: { type: "integer", minimum: 0 },
      },
    },
    colors: {
      type: "object",
      additionalProperties: false,
      required: ["background", "textPrimary", "textSecondary", "primary", "secondary", "accent"],
      properties: {
        background: HexColorOutputSchema,
        textPrimary: HexColorOutputSchema,
        textSecondary: HexColorOutputSchema,
        primary: HexColorOutputSchema,
        secondary: HexColorOutputSchema,
        accent: HexColorOutputSchema,
      },
    },
    typography: {
      type: "object",
      additionalProperties: false,
      required: ["titleStyle", "bodyStyle", "title", "body", "caption", "number"],
      properties: {
        titleStyle: { type: "string", minLength: 1 },
        bodyStyle: { type: "string", minLength: 1 },
        title: TypographyRuleOutputSchema,
        body: TypographyRuleOutputSchema,
        caption: TypographyRuleOutputSchema,
        number: TypographyRuleOutputSchema,
      },
    },
    layoutRules: StringArrayOutputSchema,
    componentRules: StringArrayOutputSchema,
    visualLanguage: { type: "string", minLength: 1 },
    negativeRules: StringArrayOutputSchema,
  },
} as const;

const LayoutLayerRoleOutputSchema = {
  type: "string",
  enum: [
    "title",
    "subtitle",
    "body",
    "visual",
    "chart",
    "metric",
    "table",
    "image",
    "caption",
    "source",
    "sectionMarker",
    "cta",
  ],
} as const;

const LayoutComponentTypeOutputSchema = {
  type: "string",
  enum: [
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
  ],
} as const;

const BBoxPreferenceOutputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["x", "y", "w", "h"],
  properties: {
    x: { type: "number", minimum: 0 },
    y: { type: "number", minimum: 0 },
    w: PositiveIntegerOutputSchema,
    h: PositiveIntegerOutputSchema,
  },
} as const;

const LayoutIRSlotOutputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["id", "role", "text", "sourceIds", "datasetIds", "tokenRefs"],
  properties: {
    id: { type: "string", minLength: 1 },
    role: LayoutLayerRoleOutputSchema,
    text: { type: "string" },
    sourceIds: StringArrayOutputSchema,
    datasetIds: StringArrayOutputSchema,
    tokenRefs: StringArrayOutputSchema,
  },
} as const;

const LayoutIRLayerOutputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["id", "slotId", "role", "editable", "bboxPreference"],
  properties: {
    id: { type: "string", minLength: 1 },
    slotId: { type: "string", minLength: 1 },
    role: LayoutLayerRoleOutputSchema,
    editable: { type: "boolean" },
    bboxPreference: BBoxPreferenceOutputSchema,
  },
} as const;

const LayoutIRSlideOutputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["id", "slideNumber", "componentType", "metadata", "slots", "layers"],
  properties: {
    id: { type: "string", minLength: 1 },
    slideNumber: PositiveIntegerOutputSchema,
    componentType: LayoutComponentTypeOutputSchema,
    metadata: {
      type: "object",
      additionalProperties: false,
      required: ["layoutPurpose"],
      properties: {
        layoutPurpose: { type: "string", enum: ["draft"] },
      },
    },
    slots: { type: "array", items: LayoutIRSlotOutputSchema },
    layers: { type: "array", items: LayoutIRLayerOutputSchema },
  },
} as const;

export const LayoutIROutputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["id", "version", "designSystemId", "canvas", "slides"],
  properties: {
    id: { type: "string", minLength: 1 },
    version: { type: "integer", enum: [1] },
    designSystemId: { type: "string", minLength: 1 },
    canvas: CanvasOutputSchema,
    slides: { type: "array", items: LayoutIRSlideOutputSchema },
  },
} as const;
