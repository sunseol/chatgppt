import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { GenerateStage } from "./GenerateStage";
import type { DeckProject } from "@/lib/deck-types";
import type { ImagePathDecisionRecord } from "@/lib/image-path-decision";

describe("generate stage production gate", () => {
  test("blocks production generation until a real image path is locked", () => {
    // Given
    const project = generateProjectFixture();

    // When
    const markup = renderToStaticMarkup(
      <GenerateStage project={project} executionMode="production" />,
    );

    // Then
    expect(markup.includes("실제 이미지 경로 Lock 필요")).toBe(true);
    expect(
      markup.includes("Production image generation requires a locked image path decision"),
    ).toBe(true);
  });

  test("blocks production generation when Codex auth was disconnected after path lock", () => {
    // Given
    const project = {
      ...generateProjectFixture(),
      imagePathDecision: codexLockedDecision(),
    };

    // When
    const markup = renderToStaticMarkup(
      <GenerateStage
        project={project}
        executionMode="production"
        providerStatuses={[
          {
            kind: "requiresAuth",
            providerId: "codex",
            message: "Live auth disconnected. Sign in again before continuing.",
          },
        ]}
      />,
    );

    // Then
    expect(markup.includes("실제 이미지 경로 Lock 필요")).toBe(true);
    expect(markup.includes("Live auth disconnected. Sign in again before continuing.")).toBe(true);
  });
});

function generateProjectFixture(): DeckProject {
  return {
    id: "project_001",
    name: "Generate Gate",
    initialPrompt: "Build a deck",
    aspectRatio: "16:9",
    language: "ko",
    slideCount: 1,
    stage: "GENERATING_SLIDES",
    createdAt: 1_789_700_000,
    updatedAt: 1_789_700_000,
    invalidated: {},
    approvalLog: [],
  };
}

function codexLockedDecision(): ImagePathDecisionRecord {
  return {
    decisionId: "image_path_codex_oauth",
    decidedAt: 1_789_700_000,
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
