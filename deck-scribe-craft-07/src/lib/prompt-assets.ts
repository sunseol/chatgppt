export const CORE_PROMPT_IDS = [
  "interview_brief",
  "research_plan",
  "research_synthesis",
  "deck_plan_markdown",
  "design_system",
  "html_layout_prototype",
  "slide_generation",
  "slide_edit",
  "visual_qa",
  "fact_qa",
  "vectorization_guidance",
  "final_report",
] as const;

export type CorePromptId = (typeof CORE_PROMPT_IDS)[number];
export type PromptVersion = "v1";
export type PromptStage =
  | "interview"
  | "research"
  | "plan"
  | "design"
  | "layout"
  | "slide-generation"
  | "edit"
  | "qa"
  | "vectorization"
  | "report";

export interface PromptAsset {
  readonly promptId: CorePromptId;
  readonly stage: PromptStage;
  readonly version: PromptVersion;
  readonly filePath: string;
  readonly contentHash: string;
}

export interface PromptUsageRecord {
  readonly promptId: CorePromptId;
  readonly promptVersion: PromptVersion;
  readonly promptHash: string;
  readonly promptFilePath: string;
  readonly stage: PromptStage;
  readonly artifactId?: string;
  readonly jobId?: string;
  readonly recordedAt: number;
}

export const PROMPT_ASSET_MANIFEST = [
  promptAsset("interview_brief", "interview", "sha256:109c835e"),
  promptAsset("research_plan", "research", "sha256:5a2a15e3"),
  promptAsset("research_synthesis", "research", "sha256:0ec238a8"),
  promptAsset("deck_plan_markdown", "plan", "sha256:ab6350c6"),
  promptAsset("design_system", "design", "sha256:fc482bfb"),
  promptAsset("html_layout_prototype", "layout", "sha256:06653c85"),
  promptAsset("slide_generation", "slide-generation", "sha256:3334a742"),
  promptAsset("slide_edit", "edit", "sha256:19458028"),
  promptAsset("visual_qa", "qa", "sha256:5d62028e"),
  promptAsset("fact_qa", "qa", "sha256:fca55f50"),
  promptAsset("vectorization_guidance", "vectorization", "sha256:0e72c3f6"),
  promptAsset("final_report", "report", "sha256:b9116390"),
] as const satisfies readonly PromptAsset[];

interface CreatePromptUsageRecordInput {
  readonly promptId: CorePromptId;
  readonly version?: PromptVersion;
  readonly artifactId?: string;
  readonly jobId?: string;
  readonly recordedAt?: number;
}

export function getPromptAsset(promptId: CorePromptId, version: PromptVersion = "v1"): PromptAsset {
  const asset = PROMPT_ASSET_MANIFEST.find(
    (candidate) => candidate.promptId === promptId && candidate.version === version,
  );
  if (!asset) {
    throw new Error(`Prompt asset ${promptId}@${version} is not registered.`);
  }
  return asset;
}

export function createPromptUsageRecord(input: CreatePromptUsageRecordInput): PromptUsageRecord {
  const asset = getPromptAsset(input.promptId, input.version ?? "v1");
  return {
    promptId: asset.promptId,
    promptVersion: asset.version,
    promptHash: asset.contentHash,
    promptFilePath: asset.filePath,
    stage: asset.stage,
    ...(input.artifactId === undefined ? {} : { artifactId: input.artifactId }),
    ...(input.jobId === undefined ? {} : { jobId: input.jobId }),
    recordedAt: input.recordedAt ?? Date.now(),
  };
}

export function createCorePromptUsageRecords(
  input: {
    readonly recordedAt?: number;
  } = {},
): readonly PromptUsageRecord[] {
  return PROMPT_ASSET_MANIFEST.map((asset) =>
    createPromptUsageRecord({
      promptId: asset.promptId,
      recordedAt: input.recordedAt,
    }),
  );
}

export function formatPromptVersionsForReport(records: readonly PromptUsageRecord[]): string {
  const lines = ["## 9. 사용된 프롬프트 버전"];
  if (records.length === 0) {
    lines.push("- 없음");
    return lines.join("\n");
  }
  for (const record of records) {
    lines.push(
      `- ${record.promptId} · ${record.promptVersion} · ${record.promptHash} · ${record.promptFilePath}`,
    );
  }
  return lines.join("\n");
}

function promptAsset(promptId: CorePromptId, stage: PromptStage, contentHash: string): PromptAsset {
  return {
    promptId,
    stage,
    version: "v1",
    filePath: `prompts/${promptId}.v1.md`,
    contentHash,
  };
}
