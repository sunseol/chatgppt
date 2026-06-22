import { describe, expect, test } from "bun:test";
import {
  getProductionImageProviderChoices,
  type ImagePathDecisionRecord,
} from "./image-path-decision";

describe("image path decision production route choices", () => {
  test("excludes legacy OpenAI API-key locks from production choices", () => {
    // Given
    const legacyOpenAiLock = {
      decisionId: "image_path_openai_api_key",
      decidedAt: 1_789_700_020,
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
    } satisfies ImagePathDecisionRecord;

    // When
    const choices = getProductionImageProviderChoices(legacyOpenAiLock);

    // Then
    expect(choices).toEqual([]);
  });
});
