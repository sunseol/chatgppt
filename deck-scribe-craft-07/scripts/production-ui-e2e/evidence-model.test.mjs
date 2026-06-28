import { describe, expect, test } from "bun:test";
import { readProductionE2eArtifactIdentity } from "./artifact-identity.mjs";
import {
  buildProductionE2eManifest,
  buildProductionE2eSummary,
  interactionDirectoryName,
  redactSensitiveText,
} from "./evidence-model.mjs";

describe("production UI E2E evidence model", () => {
  test("normalizes optional packaged artifact identity from environment", () => {
    const identity = readProductionE2eArtifactIdentity({
      DECKFORGE_PRODUCTION_E2E_DMG_PATH: " release-artifacts/DeckForge.dmg ",
      DECKFORGE_PRODUCTION_E2E_DMG_SHA256:
        " ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789 ",
      DECKFORGE_PRODUCTION_E2E_RELEASE_MANIFEST: " release-artifacts/manifest.json ",
    });

    expect(identity).toEqual({
      dmgPath: "release-artifacts/DeckForge.dmg",
      dmgSha256: "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
      releaseManifestPath: "release-artifacts/manifest.json",
    });
  });

  test("creates stable interaction directory names", () => {
    expect(interactionDirectoryName(1, "Create project")).toBe("001-create-project");
    expect(interactionDirectoryName(12, "Codex 상태 확인")).toBe("012-codex");
  });

  test("redacts common secret-bearing values", () => {
    const text =
      "Authorization: Bearer abcdefghijklmnopqrstuvwxyz\nOPENAI_API_KEY=sk-1234567890abcdef1234567890";

    const redacted = redactSensitiveText(text);

    expect(redacted.includes("Bearer [REDACTED]")).toBe(true);
    expect(redacted.includes("OPENAI_API_KEY=[REDACTED]")).toBe(true);
    expect(redacted.includes("sk-1234567890")).toBe(false);
  });

  test("marks the local production path as UI-created and fixture-free", () => {
    const summary = buildProductionE2eSummary({
      ok: true,
      mode: "local-production-preview",
      baseUrl: "http://127.0.0.1:4185/",
      outDir: "/tmp/evidence",
      interactions: [{ id: "001-create-project", ok: true }],
      failures: [],
      recordingPath: "/tmp/evidence/recording/video.webm",
    });

    expect(summary.projectStateInjection).toBe(false);
    expect(summary.fixtureProjectLoaded).toBe(false);
    expect(summary.uiCreatedProject).toBe(true);
    expect(summary.localStorageUsage).toBe(
      "fresh browser context only; no project state injection",
    );
    expect(summary.status).toBe("pass");
    expect(summary.artifactIdentity).toBe(null);
  });

  test("carries packaged artifact identity into summary and manifest", () => {
    const artifactIdentity = {
      dmgPath: "release-artifacts/DeckForge_0.0.0.15_aarch64.dmg",
      dmgSha256: "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
      releaseManifestPath: "release-artifacts/release-evidence.json",
    };
    const summary = buildProductionE2eSummary({
      ok: true,
      mode: "external-packaged-or-preview-url",
      baseUrl: "http://127.0.0.1:1420/",
      outDir: "/tmp/evidence",
      artifactIdentity,
      interactions: [],
      failures: [],
      recordingPath: "/tmp/evidence/recording/video.webm",
    });

    const manifest = buildProductionE2eManifest({
      summary,
      generatedAt: "2026-06-25T00:00:00.000Z",
      source: { commit: "abc123", dirtyWorktree: false, statusPorcelain: "" },
    });

    expect(summary.artifactIdentity).toEqual(artifactIdentity);
    expect(manifest.artifactIdentity).toEqual(artifactIdentity);
    expect(manifest.packagedCandidate).toBe(true);
    expect(manifest.localCandidate).toBe(false);
  });

  test("indexes every Section 4.5 interaction evidence file in a manifest", () => {
    const summary = buildProductionE2eSummary({
      ok: true,
      mode: "local-production-preview",
      baseUrl: "http://127.0.0.1:4185/",
      outDir: "/tmp/evidence",
      interactions: [
        {
          id: "001-create-project",
          label: "Create project",
          ok: true,
          target: { role: "button", accessibleName: "프로젝트 만들기", exact: true },
          files: {
            beforeScreenshot: "/tmp/evidence/interactions/001-create-project/before.png",
            afterScreenshot: "/tmp/evidence/interactions/001-create-project/after.png",
            beforeState: "/tmp/evidence/interactions/001-create-project/before-state.json",
            afterState: "/tmp/evidence/interactions/001-create-project/after-state.json",
            network: "/tmp/evidence/interactions/001-create-project/network.jsonl",
            ipc: "/tmp/evidence/interactions/001-create-project/ipc.jsonl",
          },
        },
      ],
      failures: [],
      recordingPath: "/tmp/evidence/recording/video.webm",
    });

    const manifest = buildProductionE2eManifest({
      summary,
      generatedAt: "2026-06-25T00:00:00.000Z",
      source: { commit: "abc123", dirtyWorktree: true, statusPorcelain: " M package.json" },
    });

    expect(manifest.requiredInteractionFiles).toEqual([
      "interaction.json",
      "before.png",
      "after.png",
      "before-state.json",
      "after-state.json",
      "ipc.jsonl",
      "network.jsonl",
    ]);
    expect(manifest.interactions[0]?.files.beforeScreenshot).toBe(
      "/tmp/evidence/interactions/001-create-project/before.png",
    );
    expect(manifest.localCandidate).toBe(true);
    expect(manifest.source.dirtyWorktree).toBe(true);
  });
});
