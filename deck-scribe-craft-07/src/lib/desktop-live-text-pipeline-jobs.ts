import { z } from "zod";
import { hashContent } from "./artifacts";
import { buildDeckPlanPrompt } from "./deck-plan-prompt";
import type { DeckPlan, DeckProject, DesignSystem } from "./deck-types";
import { DesignSystemSchema } from "./design-system";
import type { DesktopProductionCodexAppServerJobInput } from "./desktop-codex-app-server-production-job";
import type { DeckforgeTauriRuntime } from "./desktop-app-server-bridge";
import { createLiveResearchDeckPlanInput } from "./live-research-approval-gate";
import {
  DesignSystemOutputSchema,
  LayoutIROutputSchema,
} from "./desktop-live-text-pipeline-output-schemas";
import { LayoutIRSchema, type LayoutIR } from "./layout-ir";
import { parseDeckPlanMarkdown } from "./slide-spec-parser";
import type { ProviderJobManager } from "./provider-job-manager";
import type { StructuredCodexParser } from "./codex-structured-task-runner";

export type DesktopLiveTextPipelineJobContext = {
  readonly project: DeckProject;
  readonly jobManager: ProviderJobManager;
  readonly tauriRuntime?: DeckforgeTauriRuntime;
};

const DeckPlanPayloadSchema = z.object({
  markdown: z.string().min(1),
});

const DeckPlanOutputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["markdown"],
  properties: {
    markdown: { type: "string", minLength: 1 },
  },
} as const;

export function deckPlanJob(
  input: DesktopLiveTextPipelineJobContext,
): DesktopProductionCodexAppServerJobInput<DeckPlan> {
  const brief = requireApprovedBrief(input.project);
  const research = requireApprovedResearch(input.project);
  const deckPlanInput = createLiveResearchDeckPlanInput(research);
  if (deckPlanInput === undefined) throw new DesktopLiveTextPipelineInvariantError("research");
  return {
    tauriRuntime: input.tauriRuntime,
    jobManager: input.jobManager,
    capability: "deckPlan",
    description: "Run live Deck Plan desktop App Server turn",
    artifactId: deckPlanArtifactId(input.project),
    parse: parseDeckPlan(deckPlanArtifactId(input.project)),
    promptVersion: "deck_plan_desktop@v1",
    inputArtifactIds: [brief.id, research.id],
    turnRequest: {
      prompt: [
        "# Live Research Approval Handoff",
        `researchPackId: ${deckPlanInput.researchPackId}`,
        `approvedResearchPackHash: ${deckPlanInput.approvedResearchPackHash}`,
        "",
        buildDeckPlanPrompt({ brief, research }).prompt,
        "",
        'Return JSON only: { "markdown": "..." }.',
      ].join("\n"),
      outputSchema: DeckPlanOutputSchema,
      model: "gpt-5.4",
      networkAccess: false,
    },
  };
}

export function designSystemJob(
  input: DesktopLiveTextPipelineJobContext,
  deckContextId: string,
  plan: DeckPlan,
): DesktopProductionCodexAppServerJobInput<DesignSystem> {
  const brief = requireApprovedBrief(input.project);
  return {
    tauriRuntime: input.tauriRuntime,
    jobManager: input.jobManager,
    capability: "designSystem",
    description: "Run live Design System desktop App Server turn",
    artifactId: designSystemArtifactId(input.project),
    parse: parseDesignSystem,
    promptVersion: "design_system_desktop@v1",
    inputArtifactIds: [plan.id],
    turnRequest: {
      prompt: designSystemPrompt(brief.id, deckContextId, plan),
      outputSchema: DesignSystemOutputSchema,
      model: "gpt-5.4",
      networkAccess: false,
    },
  };
}

export function layoutIrJob(
  input: DesktopLiveTextPipelineJobContext,
  prompt: string,
): DesktopProductionCodexAppServerJobInput<LayoutIR> {
  return {
    tauriRuntime: input.tauriRuntime,
    jobManager: input.jobManager,
    capability: "layoutPrototype",
    description: "Run live Layout IR desktop App Server turn",
    artifactId: `${input.project.id}_layout_ir_live`,
    parse: parseLayoutIr,
    promptVersion: "layout_ir_desktop@v1",
    inputArtifactIds: [deckPlanArtifactId(input.project), designSystemArtifactId(input.project)],
    turnRequest: {
      prompt: `${prompt}\n\nReturn JSON only. Do not wrap in Markdown fences.`,
      outputSchema: LayoutIROutputSchema,
      model: "gpt-5.4",
      networkAccess: false,
    },
  };
}

function parseDeckPlan(artifactId: string): StructuredCodexParser<DeckPlan> {
  return (value) => {
    const parsed = DeckPlanPayloadSchema.safeParse(value);
    if (!parsed.success) {
      return { kind: "invalid", issues: ["Deck Plan payload requires markdown."] };
    }
    const slideSpecs = parseDeckPlanMarkdown(parsed.data.markdown);
    if (!slideSpecs.valid) {
      return { kind: "invalid", issues: slideSpecs.issues.map((issue) => issue.message) };
    }
    return {
      kind: "valid",
      value: {
        id: artifactId,
        markdown: parsed.data.markdown,
        slides: [...slideSpecs.specs],
        approvedHash: hashContent(parsed.data.markdown),
      },
    };
  };
}

function parseDesignSystem(value: unknown) {
  const parsed = DesignSystemSchema.safeParse(value);
  if (!parsed.success) {
    return {
      kind: "invalid" as const,
      issues: parsed.error.issues.map((issue) => issue.message),
    };
  }
  return {
    kind: "valid" as const,
    value: { ...parsed.data, approvedHash: hashContent(JSON.stringify(parsed.data)) },
  };
}

function parseLayoutIr(value: unknown) {
  const parsed = LayoutIRSchema.safeParse(value);
  if (!parsed.success) {
    return {
      kind: "invalid" as const,
      issues: parsed.error.issues.map((issue) => issue.message),
    };
  }
  return { kind: "valid" as const, value: parsed.data };
}

function designSystemPrompt(briefId: string, deckContextId: string, plan: DeckPlan): string {
  return [
    "# Design System Generation Package",
    `Approved brief id: ${briefId}`,
    `Deck context id: ${deckContextId}`,
    `Deck plan id: ${plan.id}`,
    "Return JSON only matching the app DesignSystem shape.",
    "Use canvas, grid, colors, typography, layoutRules, componentRules, visualLanguage, and negativeRules.",
    "Do not invent chart values. Keep cards at 8px radius and text readable.",
    "Slides:",
    ...plan.slides.map((slide) => `Slide ${slide.number}: ${slide.title} | ${slide.visualType}`),
  ].join("\n");
}

function deckPlanArtifactId(project: DeckProject): string {
  return `${project.id}_deck_plan_live`;
}

function designSystemArtifactId(project: DeckProject): string {
  return `${project.id}_design_system_live`;
}

function requireApprovedBrief(project: DeckProject) {
  if (!project.brief?.approvedHash) throw new DesktopLiveTextPipelineInvariantError("brief");
  return project.brief;
}

function requireApprovedResearch(project: DeckProject) {
  if (!project.research?.approvedHash) throw new DesktopLiveTextPipelineInvariantError("research");
  return project.research;
}

class DesktopLiveTextPipelineInvariantError extends Error {
  readonly name = "DesktopLiveTextPipelineInvariantError";
  constructor(readonly missing: "brief" | "research") {
    super(`Desktop live text pipeline requires approved ${missing}.`);
  }
}
