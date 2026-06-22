import { describe, expect, test } from "bun:test";
import type { StructuredTurnEvidence, StructuredTurnRequest } from "./live-app-server-types";
import {
  packagedEvidenceArtifactPath,
  packagedStructuredTurnHttpTimeoutMs,
  runPackagedDryRunStructuredTurn,
} from "./packaged-dry-run-codex-bridge-support";

describe("packaged dry-run Codex bridge support", () => {
  test("keeps the HTTP bridge open longer than the requested Codex turn timeout", async () => {
    const request = {
      prompt: "Generate one image.",
      outputSchema: { type: "object" },
      turnTimeoutMs: 600_000,
    } satisfies StructuredTurnRequest;
    const evidence = {
      runtime: "codex app-server --stdio",
      threadId: "thread_packaged_bridge",
      turnId: "turn_packaged_bridge",
      turnCompleted: true,
      durationMs: 601_000,
      protocolLineCount: 12,
      stderrLogLineCount: 0,
      eventMethods: ["turn/completed"],
      notifications: [],
    } satisfies StructuredTurnEvidence;
    let capturedUrl = "";
    let capturedInit:
      | {
          readonly signal?: AbortSignal | null;
          readonly timeout?: false;
        }
      | undefined;

    const result = await runPackagedDryRunStructuredTurn("http://127.0.0.1:4194", request, {
      fetch: async (url, init) => {
        capturedUrl = url;
        capturedInit = init;
        return new Response(JSON.stringify(evidence), { status: 200 });
      },
    });

    expect(result).toEqual(evidence);
    expect(capturedUrl).toBe("http://127.0.0.1:4194/api/codex/app-server/structured-turn");
    if (!capturedInit) throw new Error("Expected packaged bridge fetch init.");
    expect(capturedInit.timeout).toBe(false);
    expect(capturedInit.signal instanceof AbortSignal).toBe(true);
    expect(packagedStructuredTurnHttpTimeoutMs(request)).toBe(660_000);
  });

  test("copies product artifact paths under committed evidence without flattening identity", () => {
    expect(
      packagedEvidenceArtifactPath(
        "docs/live-evidence/codex-image/df244-packaged-generate-export-smoke-20260622",
        "projects/project_1/slides/images/slide_001.v1.png",
      ),
    ).toBe(
      "docs/live-evidence/codex-image/df244-packaged-generate-export-smoke-20260622/artifacts/projects/project_1/slides/images/slide_001.v1.png",
    );
  });

  test("rejects absolute or parent-relative artifact paths", () => {
    expect(() =>
      packagedEvidenceArtifactPath("docs/live-evidence/codex-image/demo", "/tmp/slide.png"),
    ).toThrow("Unsupported packaged evidence artifact path");
    expect(() =>
      packagedEvidenceArtifactPath("docs/live-evidence/codex-image/demo", "../slide.png"),
    ).toThrow("Unsupported packaged evidence artifact path");
  });
});
