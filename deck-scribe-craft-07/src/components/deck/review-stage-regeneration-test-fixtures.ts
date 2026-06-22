import { createBrowserImageArtifactStore } from "@/lib/browser-image-artifact-store";
import type { DeckProject } from "@/lib/deck-types";
import type { ImagePathDecisionRecord } from "@/lib/image-path-decision";
import { mockBrief, mockDesign, mockLayout, mockPlan, mockResearch } from "@/lib/mock-ai";

export async function writeOriginalCodexEvidence(storage: Storage): Promise<void> {
  const store = createBrowserImageArtifactStore(storage);
  await store.write({
    path: "projects/project_001/slides/images/slide_001.v1.png",
    content: new Uint8Array([1, 2, 3]),
  });
  await store.write({
    path: "projects/project_001/slides/images/slide_001.v1.metadata.json",
    content: JSON.stringify({
      path: "projects/project_001/slides/images/slide_001.v1.metadata.json",
      providerId: "codex",
      slideNumber: 1,
      request: { model: "gpt-image-2", turnId: "turn_codex_image_original" },
    }),
  });
  await store.write({
    path: "projects/project_001/slides/images/slide_001.v1.provenance.json",
    content: JSON.stringify({
      path: "projects/project_001/slides/images/slide_001.v1.provenance.json",
      artifactId: "project_001_image_slide_001_v1",
      providerKind: "codex",
      turnId: "turn_codex_image_original",
    }),
  });
}

export function approvedProject(): DeckProject {
  const brief = {
    ...mockBrief("Review stage live regeneration", 1, "16:9"),
    id: "brief_001",
    approvedHash: "sha256:brief",
  };
  const research = { ...mockResearch(brief), id: "research_001", approvedHash: "sha256:research" };
  const plan = { ...mockPlan(brief, research), id: "plan_001", approvedHash: "sha256:plan" };
  const design = { ...mockDesign(brief, plan), id: "design_001", approvedHash: "sha256:design" };
  const layout = { ...mockLayout(plan, design), id: "layout_001", approvedHash: "sha256:layout" };
  return {
    id: "project_001",
    name: "Review Live Regeneration",
    initialPrompt: "Create a live deck",
    aspectRatio: "16:9",
    language: "ko",
    slideCount: 1,
    stage: "SLIDE_REVIEW_PENDING",
    createdAt: 1_789_930_000,
    updatedAt: 1_789_930_000,
    brief,
    research,
    plan,
    design,
    layout,
    imagePathDecision: codexLockedDecision(),
    slides: [
      {
        number: 1,
        version: 1,
        status: "approved",
        imageDescriptor: "codex|16:9|slide_01_layout.png|slide_generation@v1",
        notes: "projects/project_001/slides/images/slide_001.v1.png",
      },
    ],
    invalidated: {},
    approvalLog: [],
  };
}

function codexLockedDecision(): ImagePathDecisionRecord {
  return {
    decisionId: "image_path_codex_oauth",
    decidedAt: 1_789_930_000,
    status: "locked",
    providerId: "codex",
    authMode: "codexOAuth",
    model: "gpt-image-2",
    billingOwner: "codex_account",
    requiredPermissions: ["codex.image_generation", "model:gpt-image-2"],
    organizationVerification: "unknown",
    fixtureFallbackAllowed: false,
    excludedRoutes: [
      {
        route: "openaiApiKey",
        reason: "OpenAI API-key image generation is not the production route.",
      },
    ],
    blockers: [],
    binaryArtifactPath: "projects/project_001/slides/images/slide_001.v1.png",
    provenanceArtifactPath: "projects/project_001/slides/images/slide_001.v1.provenance.json",
  };
}

export function clock(start: number): () => number {
  let next = start;
  return () => {
    next += 1;
    return next;
  };
}

export class MemoryStorage implements Storage {
  readonly values = new Map<string, string>();

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
    let currentIndex = 0;
    for (const key of this.values.keys()) {
      if (currentIndex === index) return key;
      currentIndex += 1;
    }
    return null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}
