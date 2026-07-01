import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "bun:test";
import { MANUAL_QA_EXPORTS, MANUAL_QA_SETUP_TASKS } from "../../src/lib/live-manual-qa-evidence.ts";
import { verifyNonDeveloperUatEvidence } from "./verify.mjs";

describe("non-developer UAT evidence verification", () => {
  test("passes a complete non-developer UAT manifest with a session artifact", async () => {
    const fixture = await createFixture();

    const result = await verifyNonDeveloperUatEvidence(fixture.manifestPath);

    expect(result.ok).toBe(true);
    expect(result.status).toBe("pass");
    expect(result.findings).toEqual([]);
    expect(result.checkedFileCount).toBe(1);
  });

  test("blocks when no manifest is provided", async () => {
    const result = await verifyNonDeveloperUatEvidence(null);

    expect(result.ok).toBe(false);
    expect(result.status).toBe("blocked");
    expect(result.findings).toContainEqual({
      code: "missing_manifest",
      path: "manifestPath",
      detail: "",
    });
  });

  test("blocks developer self-test evidence", async () => {
    const fixture = await createFixture({ evidencePatch: { testerRole: "developer" } });

    const result = await verifyNonDeveloperUatEvidence(fixture.manifestPath);

    expect(result.ok).toBe(false);
    expect(result.findings.map((finding) => finding.code)).toContain("tester_not_non_developer");
  });

  test("blocks when the session artifact is missing", async () => {
    const fixture = await createFixture({ sessionArtifactPath: "uat/missing-session.json" });

    const result = await verifyNonDeveloperUatEvidence(fixture.manifestPath);

    expect(result.ok).toBe(false);
    expect(result.findings).toContainEqual({
      code: "missing_referenced_file",
      path: "sessionArtifactPath",
      detail: "uat/missing-session.json",
    });
  });
});

async function createFixture(options = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "deckforge-non-developer-uat-"));
  const sessionArtifactPath = options.sessionArtifactPath ?? "uat/session.json";
  if (!options.sessionArtifactPath) {
    await writeFixtureFile(root, sessionArtifactPath, "session");
  }
  const evidence = {
    testerRole: "non_developer",
    sessionDurationMs: 540_000,
    setupTasks: MANUAL_QA_SETUP_TASKS,
    approvalTargetChecks: [
      { targetId: "research_pack", understood: true },
      { targetId: "slide_generation", understood: true },
      { targetId: "export", understood: true },
    ],
    openedRealSourceUrls: ["https://example.com/live-source"],
    regeneratedSlideIds: ["slide-3"],
    editedTitleSlideIds: ["slide-3"],
    openedExports: MANUAL_QA_EXPORTS,
    criticalErrorCount: 0,
    mockIndicatorCount: 0,
    placeholderOutputCount: 0,
    severityIssueListPresent: true,
    issueLog: [],
    ...options.evidencePatch,
  };
  const manifestPath = path.join(root, "non-developer-uat.json");
  await writeJson(manifestPath, {
    schemaVersion: 1,
    sourceDmgSha256: "a".repeat(64),
    sessionArtifactPath,
    evidence,
  });
  return { manifestPath };
}

async function writeFixtureFile(root, relativePath, contents) {
  const absolutePath = path.join(root, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, contents);
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}
