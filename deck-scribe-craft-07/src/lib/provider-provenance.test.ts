import { describe, expect, test } from "bun:test";
import {
  collectLineageContamination,
  createProviderArtifactProvenance,
  evaluateApprovalProvenanceGate,
  validateProviderArtifactProvenance,
} from "./provider-provenance";

describe("provider artifact provenance", () => {
  test("requires live Codex artifacts to carry turn and thread identity", () => {
    const provenance = createProviderArtifactProvenance({
      artifactId: "brief_live_1",
      executionMode: "production",
      providerKind: "codex",
      authMode: "codex_session",
      modelOrRuntime: "codex-cli 0.139.0",
      promptVersion: "interview_brief@v1",
      durationMs: 2400,
      inputArtifactIds: ["project_1"],
      turnId: "turn_001",
      threadId: "thread_001",
      fixture: false,
    });

    const validation = validateProviderArtifactProvenance(provenance);

    expect(validation.kind).toBe("complete");
  });

  test("preserves complete provider artifact provenance fields", () => {
    const provenance = createProviderArtifactProvenance({
      artifactId: "image_live_1",
      executionMode: "production",
      providerKind: "openaiImage",
      authMode: "api_key",
      modelOrRuntime: "gpt-image-2",
      promptVersion: "slide_image@v1",
      durationMs: 3200,
      inputArtifactIds: ["layout_001", "prompt_001"],
      fixture: false,
      requestId: "img_req_001",
    });

    expect(provenance).toEqual({
      artifactId: "image_live_1",
      executionMode: "production",
      providerKind: "openaiImage",
      authMode: "api_key",
      modelOrRuntime: "gpt-image-2",
      promptVersion: "slide_image@v1",
      durationMs: 3200,
      inputArtifactIds: ["layout_001", "prompt_001"],
      fixture: false,
      requestId: "img_req_001",
    });
    expect(validateProviderArtifactProvenance(provenance).kind).toBe("complete");
  });

  test("requires image provider artifacts to carry a request id", () => {
    const provenance = createProviderArtifactProvenance({
      artifactId: "image_live_2",
      executionMode: "production",
      providerKind: "openaiImage",
      authMode: "api_key",
      modelOrRuntime: "gpt-image-2",
      promptVersion: "slide_image@v1",
      durationMs: 2800,
      inputArtifactIds: ["layout_001"],
      fixture: false,
    });

    const validation = validateProviderArtifactProvenance(provenance);

    expect(validation.kind).toBe("incomplete");
    if (validation.kind !== "incomplete") return;
    expect(validation.issues.map((issue) => issue.code)).toEqual(["missing_request_id"]);
  });

  test("blocks approval when provenance identity is incomplete", () => {
    const provenance = createProviderArtifactProvenance({
      artifactId: "plan_live_1",
      executionMode: "production",
      providerKind: "codex",
      authMode: "codex_session",
      modelOrRuntime: "codex-cli 0.139.0",
      promptVersion: "deck_plan_markdown@v1",
      durationMs: 1200,
      inputArtifactIds: ["research_1"],
      fixture: false,
    });

    const gate = evaluateApprovalProvenanceGate([provenance]);

    expect(gate.kind).toBe("blocked");
    if (gate.kind !== "blocked") return;
    expect(gate.issues.map((issue) => issue.code).includes("missing_thread_or_turn")).toBe(true);
  });

  test("reports mock and fixture contamination with artifact ids", () => {
    const contamination = collectLineageContamination([
      createProviderArtifactProvenance({
        artifactId: "mock_research",
        executionMode: "production",
        providerKind: "mock",
        authMode: "none",
        modelOrRuntime: "mock-provider",
        promptVersion: "research_synthesis@v1",
        durationMs: 1,
        inputArtifactIds: [],
        fixture: true,
      }),
    ]);

    expect(contamination.mockArtifactIds).toEqual(["mock_research"]);
    expect(contamination.fixtureArtifactIds).toEqual(["mock_research"]);
  });
});
