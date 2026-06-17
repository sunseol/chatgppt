import { z } from "zod";
import type { SlideSpec } from "./deck-types";

export type SlideSpecField =
  | "title"
  | "role"
  | "coreMessage"
  | "bodyPoints"
  | "visualComposition"
  | "evidence"
  | "editableElements"
  | "dataSourceConstraints";

export type SlideSpecValidationCode =
  | "missing_field"
  | "invalid_slide_heading"
  | "schema_validation";

export interface SlideSpecValidationIssue {
  readonly code: SlideSpecValidationCode;
  readonly severity: "fatal";
  readonly message: string;
  readonly slideNumber?: number;
  readonly field?: SlideSpecField;
}

export interface SlideSpecParseResult {
  readonly valid: boolean;
  readonly specs: readonly SlideSpec[];
  readonly issues: readonly SlideSpecValidationIssue[];
}

interface SlideSection {
  readonly number: number;
  readonly headingTitle: string;
  readonly lines: readonly string[];
}

export const SlideSpecSchema = z.object({
  number: z.number().int().min(1),
  title: z.string().min(1),
  role: z.string().min(1),
  coreMessage: z.string().min(1),
  bodyPoints: z.array(z.string().min(1)).min(1),
  visualType: z.string().min(1),
  visualComposition: z.string().min(1),
  evidence: z.array(z.string().min(1)),
  editableElements: z.array(z.string().min(1)).min(1),
  dataSourceConstraints: z.array(z.string().min(1)).min(1),
});

const REQUIRED_FIELDS: readonly SlideSpecField[] = [
  "title",
  "role",
  "coreMessage",
  "bodyPoints",
  "visualComposition",
  "evidence",
  "editableElements",
  "dataSourceConstraints",
];

const FIELD_NAMES: Readonly<Record<SlideSpecField, string>> = {
  title: "title",
  role: "role",
  coreMessage: "core message",
  bodyPoints: "body points",
  visualComposition: "visual composition",
  evidence: "evidence",
  editableElements: "editable elements",
  dataSourceConstraints: "data/source constraints",
};

const LABEL_TO_FIELD: Readonly<Partial<Record<string, SlideSpecField>>> = {
  title: "title",
  제목: "title",
  role: "role",
  역할: "role",
  "core message": "coreMessage",
  "핵심 메시지": "coreMessage",
  "body points": "bodyPoints",
  body: "bodyPoints",
  본문: "bodyPoints",
  "본문 포인트": "bodyPoints",
  "visual direction": "visualComposition",
  "visual composition": "visualComposition",
  "시각화 방향": "visualComposition",
  evidence: "evidence",
  "사용할 근거": "evidence",
  근거: "evidence",
  "editable elements": "editableElements",
  "편집 가능 요소": "editableElements",
  "data/source constraints": "dataSourceConstraints",
  "data source constraints": "dataSourceConstraints",
  "source constraints": "dataSourceConstraints",
  "data constraints": "dataSourceConstraints",
  "데이터/출처 제약": "dataSourceConstraints",
  "데이터 출처 제약": "dataSourceConstraints",
  "출처 제약": "dataSourceConstraints",
};

export function parseDeckPlanMarkdown(markdown: string): SlideSpecParseResult {
  const sections = collectSlideSections(markdown);
  const issues: SlideSpecValidationIssue[] = [];
  const specs: SlideSpec[] = [];

  if (sections.length === 0) {
    issues.push({
      code: "invalid_slide_heading",
      severity: "fatal",
      message: "Deck Plan markdown must include at least one Slide heading.",
    });
  }

  for (const section of sections) {
    const fields = parseFields(section.lines);
    issues.push(...validateRequiredFields(section, fields));

    const spec = createSlideSpec(section, fields);
    const result = SlideSpecSchema.safeParse(spec);
    if (result.success) {
      specs.push(result.data);
    } else {
      issues.push(...schemaIssues(section.number, result.error.issues));
    }
  }

  return Object.freeze({
    valid: issues.length === 0,
    specs: Object.freeze(specs),
    issues: Object.freeze(issues),
  });
}

function collectSlideSections(markdown: string): SlideSection[] {
  const sections: SlideSection[] = [];
  let current: { number: number; headingTitle: string; lines: string[] } | undefined;

  for (const line of markdown.split(/\r?\n/)) {
    const heading = parseSlideHeading(line);
    if (heading) {
      if (current) sections.push(current);
      current = { ...heading, lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }

  if (current) sections.push(current);
  return sections;
}

function parseSlideHeading(
  line: string,
): Pick<SlideSection, "number" | "headingTitle"> | undefined {
  const match = line.match(/^#{2,3}\s*Slide\s+(\d+)\.\s*(.+?)\s*$/i);
  const numberText = match?.[1];
  const headingTitle = match?.[2]?.trim();
  if (!numberText || !headingTitle) return undefined;

  const number = Number.parseInt(numberText, 10);
  if (!Number.isInteger(number) || number < 1) return undefined;

  return { number, headingTitle };
}

function parseFields(lines: readonly string[]): Partial<Record<SlideSpecField, string>> {
  const fields: Partial<Record<SlideSpecField, string>> = {};

  for (const line of lines) {
    const match = line.match(/^\s*[-*]\s*([^:：]+)\s*[:：]\s*(.*?)\s*$/);
    const label = match?.[1];
    const value = match?.[2];
    if (!label || value === undefined) continue;

    const field = LABEL_TO_FIELD[normalizeLabel(label)];
    if (field) fields[field] = value.trim();
  }

  return fields;
}

function validateRequiredFields(
  section: SlideSection,
  fields: Partial<Record<SlideSpecField, string>>,
): SlideSpecValidationIssue[] {
  const issues: SlideSpecValidationIssue[] = [];

  for (const field of REQUIRED_FIELDS) {
    if (!isFieldPresent(section, fields, field)) {
      issues.push({
        code: "missing_field",
        severity: "fatal",
        slideNumber: section.number,
        field,
        message: `Slide ${section.number} is missing ${FIELD_NAMES[field]}.`,
      });
    }
  }

  return issues;
}

function isFieldPresent(
  section: SlideSection,
  fields: Partial<Record<SlideSpecField, string>>,
  field: SlideSpecField,
): boolean {
  if (field === "title" && section.headingTitle.trim().length > 0) return true;
  return fields[field] !== undefined && fields[field].trim().length > 0;
}

function createSlideSpec(
  section: SlideSection,
  fields: Partial<Record<SlideSpecField, string>>,
): SlideSpec {
  const visualComposition = fields.visualComposition?.trim() ?? "";

  return {
    number: section.number,
    title: fields.title?.trim() || section.headingTitle,
    role: fields.role?.trim() ?? "",
    coreMessage: fields.coreMessage?.trim() ?? "",
    bodyPoints: splitList(fields.bodyPoints),
    visualType: visualComposition,
    visualComposition,
    evidence: splitEvidence(fields.evidence),
    editableElements: splitList(fields.editableElements),
    dataSourceConstraints: splitList(fields.dataSourceConstraints),
  };
}

function schemaIssues(
  slideNumber: number,
  issues: readonly z.ZodIssue[],
): SlideSpecValidationIssue[] {
  return issues.map((issue) => ({
    code: "schema_validation",
    severity: "fatal",
    slideNumber,
    message: `Slide ${slideNumber} failed schema validation: ${issue.path.join(".") || issue.message}.`,
  }));
}

function splitList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(/[,;、]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function splitEvidence(value: string | undefined): string[] {
  if (!value) return [];
  const trimmed = value.trim().toLowerCase();
  if (trimmed === "none" || trimmed === "없음" || trimmed === "n/a" || trimmed === "na") return [];
  return splitList(value);
}

function normalizeLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, " ");
}
