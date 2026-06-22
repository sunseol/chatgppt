import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { collectCodexImageGenerationResult } from "../src/lib/codex-image-result-mapper";
import type { CodexImageClient, CodexImageClientRequest } from "../src/lib/codex-image-provider";
import type { BrowserImageArtifactWrite } from "../src/lib/browser-image-artifact-store";
import type { DeckProject } from "../src/lib/deck-types";
import type { ImageArtifactStore, ImageArtifactStoreWrite } from "../src/lib/image-artifact-store";
import { mockBrief, mockDesign, mockLayout, mockPlan, mockResearch } from "../src/lib/mock-ai";
import { runStructuredTurn, type StructuredTurnEvidence } from "./live-app-server-json-rpc";

const IMAGE_TURN_MODEL = "gpt-5.4";
const IMAGE_TURN_TIMEOUT_MS = 600_000;

const IMAGE_GENERATION_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["status"],
  properties: {
    status: { type: "string" },
  },
} as const;

export class FileBackedArtifactStore implements ImageArtifactStore {
  readonly writes: ImageArtifactStoreWrite[] = [];

  async write(entry: ImageArtifactStoreWrite): Promise<void> {
    this.writes.push(entry);
    await mkdir(dirname(entry.path), { recursive: true });
    await writeFile(entry.path, entry.content);
  }

  browserWrites(): readonly BrowserImageArtifactWrite[] {
    return this.writes.map((write) => ({
      path: write.path,
      content:
        typeof write.content === "string"
          ? { kind: "text", value: write.content }
          : { kind: "base64", value: Buffer.from(write.content).toString("base64") },
    }));
  }
}

export class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

export function createLiveCodexImageClient(): CodexImageClient & {
  readonly evidence: StructuredTurnEvidence[];
} {
  const evidence: StructuredTurnEvidence[] = [];
  return {
    evidence,
    async generate(request: CodexImageClientRequest) {
      const turnEvidence = await runStructuredTurn(buildImageTurnRequest(request));
      evidence.push(turnEvidence);
      const result = collectCodexImageGenerationResult({
        notifications: turnEvidence.notifications,
        runtime: turnEvidence.runtime,
        durationMs: turnEvidence.durationMs,
      });
      if (result.kind === "blocked") {
        throw new Error(result.issues.join(" "));
      }
      return result.response;
    },
  };
}

export function approvedProject(
  projectId: string,
  now: number,
  options: { readonly slideCount?: number } = {},
): DeckProject {
  const slideCount = options.slideCount ?? 1;
  const brief = {
    ...mockBrief("Codex generate export smoke", slideCount, "16:9"),
    id: "brief_generate_export_smoke",
    approvedHash: "sha256:brief-generate-export-smoke",
  };
  const research = {
    ...mockResearch(brief),
    id: "research_generate_export_smoke",
    approvedHash: "sha256:research-generate-export-smoke",
  };
  const plan = {
    ...mockPlan(brief, research),
    id: "plan_generate_export_smoke",
    approvedHash: "sha256:plan-generate-export-smoke",
  };
  const design = {
    ...mockDesign(brief, plan),
    id: "design_generate_export_smoke",
    approvedHash: "sha256:design-generate-export-smoke",
  };
  const layout = {
    ...mockLayout(plan, design),
    id: "layout_generate_export_smoke",
    approvedHash: "sha256:layout-generate-export-smoke",
  };
  return {
    id: projectId,
    name: "Codex Generate Export Smoke",
    initialPrompt: "Create one live Codex image slide and export its evidence.",
    aspectRatio: "16:9",
    language: "ko",
    slideCount: 1,
    stage: "GENERATING_SLIDES",
    createdAt: now,
    updatedAt: now,
    brief,
    research,
    plan,
    design,
    layout,
    invalidated: {},
    approvalLog: [],
  };
}

export function sequentialIds(prefix: string): () => string {
  let next = 0;
  return () => {
    next += 1;
    return `${prefix}_${next}`;
  };
}

export function clock(start: number): () => number {
  let next = start;
  return () => {
    next += 1;
    return next;
  };
}

export function contentBytes(content: ImageArtifactStoreWrite["content"]): number {
  return typeof content === "string" ? Buffer.byteLength(content) : content.length;
}

export async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

export async function sha256File(path: string): Promise<string> {
  return createHash("sha256")
    .update(await readFile(path))
    .digest("hex");
}

export function appServerErrors(evidence: StructuredTurnEvidence): readonly string[] {
  return evidence.notifications.flatMap((notification) => {
    if (notification.method !== "error") return [];
    if (!isRecord(notification.params)) return ["unknown App Server error"];
    const error = notification.params["error"];
    if (!isRecord(error)) return ["unknown App Server error"];
    const message = error["message"];
    return typeof message === "string" ? [message] : ["unknown App Server error"];
  });
}

function buildImageTurnRequest(request: CodexImageClientRequest) {
  return {
    prompt: [
      "Generate one production slide image using the signed-in Codex image generation capability.",
      "Do not use OpenAI API keys or external bearer credentials.",
      `Target image model: ${request.model}`,
      `Aspect ratio: ${request.aspectRatio}`,
      `Layout reference screenshot: ${request.layoutReference.screenshot}`,
      `Layout reference mode: ${request.layoutReference.mode}`,
      "",
      "[SLIDE IMAGE PROMPT]",
      request.prompt,
      "",
      'After the image generation call completes, return {"status":"image_generated"}.',
    ].join("\n"),
    outputSchema: IMAGE_GENERATION_OUTPUT_SCHEMA,
    model: IMAGE_TURN_MODEL,
    networkAccess: false,
    turnTimeoutMs: IMAGE_TURN_TIMEOUT_MS,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
