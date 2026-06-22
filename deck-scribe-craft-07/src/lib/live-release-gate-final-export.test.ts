import { describe, expect, test } from "bun:test";
import { evaluateLiveInitialReleaseGate, type LiveReleaseGateInput } from "./live-release-gate";
import { readyLiveReleaseGateInput } from "./live-release-gate-test-fixtures";
import { createProviderArtifactProvenance } from "./provider-provenance";

describe("live initial release gate final export evidence", () => {
  test("blocks placeholder final export artifact ids in Golden Path lineage", () => {
    // Given
    const result = evaluateLiveInitialReleaseGate(
      readyInputWithFinalExport("placeholder_export_artifact"),
    );

    // When / Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.blockers.map((blocker) => blocker.code)).toEqual(["golden_path_export_missing"]);
    expect(result.blockers[0]?.refs).toEqual(["placeholder_export_artifact"]);
  });

  test("blocks final export lineage outside the production Codex session", () => {
    const input = readyInputWithFinalExport("live_export_001");
    const result = evaluateLiveInitialReleaseGate({
      ...input,
      goldenPathLineage: [
        createProviderArtifactProvenance({
          artifactId: "live_export_001",
          executionMode: "development",
          providerKind: "local",
          authMode: "local",
          modelOrRuntime: "local-exporter",
          promptVersion: "final_report@v1",
          durationMs: 500,
          inputArtifactIds: ["live_slide_1"],
          fixture: false,
        }),
      ],
    });

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.blockers.map((blocker) => blocker.code)).toEqual(["golden_path_export_not_live"]);
    expect(result.blockers[0]?.refs).toEqual(["live_export_001:development/local/local"]);
  });

  test("blocks final export lineage with noncanonical Codex turn identities", () => {
    // Given
    const input = readyInputWithFinalExport("live_export_001");
    const result = evaluateLiveInitialReleaseGate({
      ...input,
      goldenPathLineage: [
        createProviderArtifactProvenance({
          artifactId: "live_export_001",
          executionMode: "production",
          providerKind: "codex",
          authMode: "codex_session",
          modelOrRuntime: "codex-cli 0.141.0",
          promptVersion: "final_report@v1",
          durationMs: 500,
          inputArtifactIds: ["live_slide_1"],
          turnId: " turn_final ",
          threadId: "thread_project",
          fixture: false,
        }),
      ],
    });

    // When / Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.blockers.map((blocker) => blocker.code)).toEqual(["golden_path_export_not_live"]);
  });

  test("blocks final export lineage with missing model and prompt metadata", () => {
    // Given
    const input = readyInputWithFinalExport("live_export_001");
    const result = evaluateLiveInitialReleaseGate({
      ...input,
      goldenPathLineage: [
        createProviderArtifactProvenance({
          artifactId: "live_export_001",
          executionMode: "production",
          providerKind: "codex",
          authMode: "codex_session",
          modelOrRuntime: "",
          promptVersion: "",
          durationMs: 500,
          inputArtifactIds: ["live_slide_1"],
          turnId: "turn_final",
          threadId: "thread_project",
          fixture: false,
        }),
      ],
    });

    // When / Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.blockers.map((blocker) => blocker.code)).toEqual(["golden_path_export_not_live"]);
  });
});

function readyInputWithFinalExport(finalExportArtifactId: string): LiveReleaseGateInput {
  const input = readyLiveReleaseGateInput();
  return {
    ...input,
    goldenPathFinalExportArtifactId: finalExportArtifactId,
    goldenPathLineage: [
      createProviderArtifactProvenance({
        artifactId: finalExportArtifactId,
        executionMode: "production",
        providerKind: "codex",
        authMode: "codex_session",
        modelOrRuntime: "codex-cli 0.141.0",
        promptVersion: "final_report@v1",
        durationMs: 500,
        inputArtifactIds: ["live_slide_1"],
        turnId: "turn_final",
        threadId: "thread_project",
        fixture: false,
      }),
    ],
  };
}
