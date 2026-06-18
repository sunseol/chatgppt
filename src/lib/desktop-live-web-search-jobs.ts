import type { DeckProject, InterviewBrief } from "./deck-types";
import type { DesktopProductionCodexAppServerJobInput } from "./desktop-codex-app-server-production-job";
import type { DeckforgeTauriRuntime } from "./desktop-app-server-bridge";
import type { LiveWebSearchEvidence } from "./live-web-search-evidence";
import { validateLiveWebSearchEvidence } from "./live-web-search-evidence";
import type { ProviderJobManager } from "./provider-job-manager";
import { LiveWebSearchEvidenceSchema } from "./research-pack-live-schema";

export type DesktopLiveWebSearchJobContext = {
  readonly project: DeckProject;
  readonly jobManager: ProviderJobManager;
  readonly tauriRuntime?: DeckforgeTauriRuntime;
};

const LiveWebSearchOutputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["researchTurnId", "webSearchMode", "queries", "candidates", "latestnessBenchmark"],
  properties: {
    researchTurnId: { type: "string", minLength: 1 },
    webSearchMode: { enum: ["live", "cached", "mock"] },
    queries: { type: "array", items: { type: "string", minLength: 1 } },
    candidates: {
      type: "array",
      minItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "url", "title", "discoveredAt", "query", "sourceCandidateType", "mode"],
        properties: {
          id: { type: "string", minLength: 1 },
          url: { type: "string", format: "uri" },
          title: { type: "string", minLength: 1 },
          discoveredAt: { type: "integer", minimum: 0 },
          query: { type: "string", minLength: 1 },
          sourceCandidateType: { enum: ["official", "primary", "secondary", "dataset"] },
          mode: { enum: ["live", "cached", "mock"] },
        },
      },
    },
    latestnessBenchmark: {
      type: "object",
      additionalProperties: false,
      required: ["query", "mode", "completedAt", "candidateIds"],
      properties: {
        query: { type: "string", minLength: 1 },
        mode: { enum: ["live", "cached", "mock"] },
        completedAt: { type: "integer", minimum: 0 },
        candidateIds: { type: "array", items: { type: "string", minLength: 1 } },
      },
    },
  },
} as const;

export function liveWebSearchEvidenceJob(
  input: DesktopLiveWebSearchJobContext,
): DesktopProductionCodexAppServerJobInput<LiveWebSearchEvidence> {
  const brief = requireApprovedBrief(input.project);
  return {
    tauriRuntime: input.tauriRuntime,
    jobManager: input.jobManager,
    capability: "research",
    description: "Run live Research web_search desktop App Server turn",
    artifactId: liveWebSearchArtifactId(input.project),
    parse: parseLiveWebSearchEvidence,
    promptVersion: "research_web_search_desktop@v1",
    inputArtifactIds: [brief.id],
    turnRequest: {
      prompt: liveWebSearchPrompt(input.project, brief),
      outputSchema: LiveWebSearchOutputSchema,
      model: "gpt-5.4",
      networkAccess: true,
    },
  };
}

function parseLiveWebSearchEvidence(value: unknown) {
  const parsed = LiveWebSearchEvidenceSchema.safeParse(value);
  if (!parsed.success) {
    return { kind: "invalid" as const, issues: parsed.error.issues.map((issue) => issue.message) };
  }
  const report = validateLiveWebSearchEvidence(parsed.data);
  if (!report.valid) {
    return { kind: "invalid" as const, issues: report.issues.map((issue) => issue.message) };
  }
  return { kind: "valid" as const, value: parsed.data };
}

function liveWebSearchPrompt(project: DeckProject, brief: InterviewBrief): string {
  return [
    "# Live Research Web Search",
    "Use live web search/network access to discover source candidates for the approved brief.",
    "Return JSON only matching the LiveWebSearchEvidence shape.",
    "Every candidate must be from actual live search results, have mode live, and include URL, title, discoveredAt, query, and sourceCandidateType.",
    "Return at least three candidates from three distinct domains, with a live latestnessBenchmark.",
    "Set researchTurnId to pending_app_server_turn; DeckForge replaces it with the durable App Server turn id.",
    `Project id: ${project.id}`,
    `Brief id: ${brief.id}`,
    `Goal: ${brief.goal}`,
    `Audience: ${brief.audience}`,
    `Desired outcome: ${brief.desiredOutcome}`,
    `Language: ${brief.language}`,
    `Must include: ${brief.mustInclude.join(", ")}`,
    `Must avoid: ${brief.mustAvoid.join(", ")}`,
  ].join("\n");
}

function liveWebSearchArtifactId(project: DeckProject): string {
  return `${project.id}_live_web_search`;
}

function requireApprovedBrief(project: DeckProject): InterviewBrief {
  if (!project.brief?.approvedHash) throw new DesktopLiveWebSearchInvariantError();
  return project.brief;
}

class DesktopLiveWebSearchInvariantError extends Error {
  readonly name = "DesktopLiveWebSearchInvariantError";
  constructor() {
    super("Desktop live web search requires an approved interview brief.");
  }
}
