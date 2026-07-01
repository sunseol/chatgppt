import { ResearchPackSchema } from "./research-pack-schema";
import type { DeckProject, InterviewBrief, ResearchPack } from "./deck-types";
import type { DesktopProductionCodexAppServerJobInput } from "./desktop-codex-app-server-production-job";
import type { DeckforgeTauriRuntime } from "./desktop-app-server-bridge";
import type { ProviderJobManager } from "./provider-job-manager";

export type DesktopLiveResearchPackJobContext = {
  readonly project: DeckProject;
  readonly jobManager: ProviderJobManager;
  readonly tauriRuntime?: DeckforgeTauriRuntime;
};

const ResearchPackOutputSchema = {
  type: "object",
  additionalProperties: true,
  required: ["id", "sources", "claims", "datasets", "charts", "factCheckReport"],
  properties: {
    id: { type: "string", minLength: 1 },
    sources: { type: "array", minItems: 1 },
    claims: { type: "array" },
    datasets: { type: "array" },
    charts: { type: "array" },
    factCheckReport: { type: "object" },
    liveEvidenceRefs: { type: "array" },
    webSearchEvidence: { type: "object" },
  },
} as const;

export function liveResearchPackJob(
  input: DesktopLiveResearchPackJobContext,
): DesktopProductionCodexAppServerJobInput<ResearchPack> {
  const brief = requireApprovedBrief(input.project);
  return {
    tauriRuntime: input.tauriRuntime,
    jobManager: input.jobManager,
    capability: "research",
    description: "Run live Research Pack desktop App Server turn",
    artifactId: liveResearchPackArtifactId(input.project),
    parse: parseResearchPack,
    promptVersion: "research_pack_desktop@v1",
    inputArtifactIds: [brief.id],
    turnRequest: {
      prompt: liveResearchPackPrompt(input.project, brief),
      outputSchema: ResearchPackOutputSchema,
      model: "gpt-5.4",
      networkAccess: true,
    },
  };
}

function parseResearchPack(value: unknown) {
  const parsed = ResearchPackSchema.safeParse(value);
  if (!parsed.success) {
    return { kind: "invalid" as const, issues: parsed.error.issues.map((issue) => issue.message) };
  }
  return { kind: "valid" as const, value: parsed.data };
}

function liveResearchPackPrompt(project: DeckProject, brief: InterviewBrief): string {
  return [
    "# Live Research Pack",
    "Use live web search/network access to create an approval-ready ResearchPack.",
    "Return JSON only matching the DeckForge ResearchPack shape.",
    "Every factual claim must cite sources, and major numbers need numericEvidence plus a dataset.",
    "Every source must include capture metadata with originalUrl, finalUrl, fetchedAt, mimeType, statusCode, contentHash, rawArchivePath, textArchivePath, extractedTextHash, and version.",
    "liveEvidenceRefs must point each factual claim to a quote_span or table_reference in a captured source artifact.",
    "Use only real source URLs. Do not use mock, example, or placeholder URLs.",
    `Research pack id: ${liveResearchPackArtifactId(project)}`,
    `Project id: ${project.id}`,
    `Brief id: ${brief.id}`,
    `Goal: ${brief.goal}`,
    `Audience: ${brief.audience}`,
    `Desired outcome: ${brief.desiredOutcome}`,
    `Language: ${brief.language}`,
    `Must include: ${brief.mustInclude.join(", ")}`,
    `Must avoid: ${brief.mustAvoid.join(", ")}`,
    `Slide count: ${brief.slideCount}`,
  ].join("\n");
}

function liveResearchPackArtifactId(project: DeckProject): string {
  return `${project.id}_research_pack_live`;
}

function requireApprovedBrief(project: DeckProject): InterviewBrief {
  if (!project.brief?.approvedHash) throw new DesktopLiveResearchPackInvariantError();
  return project.brief;
}

class DesktopLiveResearchPackInvariantError extends Error {
  readonly name = "DesktopLiveResearchPackInvariantError";
  constructor() {
    super("Desktop live research pack requires an approved interview brief.");
  }
}
