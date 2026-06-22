import { describe, expect, test } from "bun:test";
import type { ImagePathDecisionRecord } from "./image-path-decision";
import { createProductionImageGenerationGate } from "./production-image-generation-gate";

describe("production image generation OAuth route", () => {
  test("blocks OpenAI API-key image decisions in production", () => {
    const gate = createProductionImageGenerationGate({
      executionMode: "production",
      imagePathDecision: openAiApiKeyDecision(),
    });

    expect(gate).toEqual({
      kind: "blocked",
      executionMode: "production",
      providerId: "openaiImage",
      issues: [
        {
          code: "production_codex_oauth_required",
          message: "Production image generation must use Codex OAuth image generation.",
        },
      ],
    });
  });
});

function openAiApiKeyDecision(): ImagePathDecisionRecord {
  return {
    decisionId: "image_path_openai_api_key",
    decidedAt: 1_789_700_000,
    status: "locked",
    providerId: "openaiImage",
    authMode: "openaiApiKey",
    model: "gpt-image-2",
    billingOwner: "openai_api_project",
    requiredPermissions: ["images.generate", "model:gpt-image-2"],
    organizationVerification: "verified",
    fixtureFallbackAllowed: false,
    excludedRoutes: [
      {
        route: "codexOAuth",
        reason: "Codex image generation is not confirmed for this runtime.",
      },
    ],
    blockers: [],
    binaryArtifactPath: "projects/project_001/slides/images/slide_001.v1.png",
    provenanceArtifactPath: "projects/project_001/slides/images/slide_001.v1.provenance.json",
    requestId: "img_req_001",
  };
}
