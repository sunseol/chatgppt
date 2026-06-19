import type { DeckProject, ResearchPack, Stage } from "./deck-types";
import { ResearchPackSchema } from "./research-pack-schema";
import { redactSensitiveText } from "./redaction";

const STAGES: readonly Stage[] = [
  "PROJECT_CREATED",
  "INTERVIEWING",
  "INTERVIEW_APPROVAL_PENDING",
  "RESEARCHING",
  "RESEARCH_APPROVAL_PENDING",
  "PLANNING",
  "PLAN_APPROVAL_PENDING",
  "DESIGNING",
  "DESIGN_APPROVAL_PENDING",
  "PROTOTYPING_LAYOUT",
  "LAYOUT_APPROVAL_PENDING",
  "GENERATING_SLIDES",
  "SLIDE_REVIEW_PENDING",
  "VECTORIZE_PENDING",
  "VECTORIZING",
  "EDITABLE_REVIEW_PENDING",
  "EDITOR",
  "FINAL_REPORTING",
  "EXPORT_READY",
];

const ASPECT_RATIOS = ["16:9", "4:3"] as const;
const LANGUAGES = ["ko", "en", "mixed"] as const;

export function serializeProjectList(projects: readonly DeckProject[]): string {
  return redactSensitiveText(JSON.stringify(projects));
}

export function parseProjectList(raw: string | null): DeckProject[] {
  if (raw === null) return [];
  const parsed = parseJson(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed.flatMap(parseDeckProject);
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch (error) {
    if (error instanceof SyntaxError) return [];
    throw error;
  }
}

function isDeckProject(value: unknown): value is DeckProject {
  if (!isRecord(value)) return false;
  return (
    isString(value["id"]) &&
    isString(value["name"]) &&
    isString(value["initialPrompt"]) &&
    isAspectRatio(value["aspectRatio"]) &&
    isLanguage(value["language"]) &&
    isNumber(value["slideCount"]) &&
    isStage(value["stage"]) &&
    isNumber(value["createdAt"]) &&
    isNumber(value["updatedAt"]) &&
    isRecord(value["invalidated"]) &&
    Array.isArray(value["approvalLog"])
  );
}

function parseDeckProject(value: unknown): readonly DeckProject[] {
  if (!isDeckProject(value)) return [];
  return [normalizeDeckProject(value)];
}

function normalizeDeckProject(project: DeckProject): DeckProject {
  const research = normalizeStoredResearchPack(project.research);
  return research === undefined ? project : { ...project, research };
}

function normalizeStoredResearchPack(research: ResearchPack | undefined): ResearchPack | undefined {
  if (research === undefined) return undefined;
  const parsed = ResearchPackSchema.safeParse(research);
  if (!parsed.success) return undefined;
  return {
    ...parsed.data,
    liveEvidenceRefs: parsed.data.liveEvidenceRefs ?? [],
    provenanceLineage: parsed.data.provenanceLineage ?? [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isStage(value: unknown): value is Stage {
  return isString(value) && STAGES.some((stage) => stage === value);
}

function isAspectRatio(value: unknown): value is "16:9" | "4:3" {
  return isString(value) && ASPECT_RATIOS.some((ratio) => ratio === value);
}

function isLanguage(value: unknown): value is "ko" | "en" | "mixed" {
  return isString(value) && LANGUAGES.some((language) => language === value);
}
