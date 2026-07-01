import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { evaluateReleaseEvidenceBundle, hashManifestForBundle } from "./preflight.mjs";

describe("final release evidence bundle preflight", () => {
  test("passes only when every DF-REL-003 required evidence item and sign-off is present", async () => {
    const manifest = withChecksum(completeManifest());
    const evidenceRoot = await createEvidenceRoot({
      ".omx/artifacts/pass/verification.json": { ok: true, status: "pass" },
    });

    const result = await evaluateReleaseEvidenceBundle(manifest, { evidenceRoot });

    expect(result.ok).toBe(true);
    expect(result.status).toBe("ready");
    expect(result.findings).toEqual([]);
  });

  test("blocks local candidate evidence that is missing external release gates", async () => {
    const manifest = withChecksum({
      ...completeManifest(),
      qaStatus: "local-candidate",
      artifactIdentity: { ...identity(), dirtyWorktree: true },
      evidence: {
        releaseArtifact: evidence("pass"),
        automation: evidence("pass"),
        uiContract: evidence("pass"),
        section45Interactions: evidence("pass"),
        secretScan: evidence("pass"),
      },
      releaseBlockers: {
        "DF-REL-001": "open",
        "DF-E2E-112": "open",
        "DF-REL-002": "open",
        "DF-PPT-001": "open",
        "DF-UAT-001": "open",
        "DF-SEC-001": "open",
      },
      signOff: {},
    });
    const evidenceRoot = await createEvidenceRoot({
      ".omx/artifacts/pass/verification.json": { ok: true, status: "pass" },
    });

    const result = await evaluateReleaseEvidenceBundle(manifest, { evidenceRoot });

    expect(result.ok).toBe(false);
    expect(result.status).toBe("blocked");
    expect(result.findings.map((finding) => finding.code)).toContain("qa_status_not_final");
    expect(result.findings.map((finding) => finding.path)).toContain("evidence.packagedGoldenPath");
    expect(result.findings.map((finding) => finding.path)).toContain("evidence.cleanMachine");
    expect(result.findings.map((finding) => finding.path)).toContain(
      "evidence.powerPointRoundTrip",
    );
    expect(result.findings.map((finding) => finding.path)).toContain("evidence.nonDeveloperUat");
    expect(result.findings.map((finding) => finding.code)).toContain("release_blocker_not_closed");
    expect(result.findings.map((finding) => finding.code)).toContain("missing_signoff_name");
  });

  test("blocks evidence that mixes DMG hashes", async () => {
    const manifest = withChecksum({
      ...completeManifest(),
      evidence: {
        ...completeEvidence(),
        cleanMachine: evidence("pass", { dmgSha256: "b".repeat(64) }),
      },
    });
    const evidenceRoot = await createEvidenceRoot({
      ".omx/artifacts/pass/verification.json": { ok: true, status: "pass" },
    });

    const result = await evaluateReleaseEvidenceBundle(manifest, { evidenceRoot });

    expect(result.ok).toBe(false);
    expect(result.findings.map((finding) => finding.code)).toContain("evidence_dmg_hash_mismatch");
  });

  test("blocks a pass-labelled local evidence path that does not exist", async () => {
    const manifest = withChecksum({
      ...completeManifest(),
      evidence: {
        ...completeEvidence(),
        cleanMachine: evidence("pass", {
          path: ".omx/artifacts/missing-clean-machine/verification.json",
        }),
      },
    });
    const evidenceRoot = await createEvidenceRoot({
      ".omx/artifacts/pass/verification.json": { ok: true, status: "pass" },
    });

    const result = await evaluateReleaseEvidenceBundle(manifest, { evidenceRoot });

    expect(result.ok).toBe(false);
    expect(result.findings.map((finding) => finding.code)).toContain(
      "missing_evidence_verification_file",
    );
  });

  test("blocks a pass-labelled evidence file whose verification is not ok", async () => {
    const manifest = withChecksum({
      ...completeManifest(),
      evidence: {
        ...completeEvidence(),
        powerPointRoundTrip: evidence("pass", {
          path: ".omx/artifacts/powerpoint-round-trip/verification.json",
        }),
      },
    });
    const evidenceRoot = await createEvidenceRoot({
      ".omx/artifacts/pass/verification.json": { ok: true, status: "pass" },
      ".omx/artifacts/powerpoint-round-trip/verification.json": {
        ok: false,
        status: "blocked",
      },
    });

    const result = await evaluateReleaseEvidenceBundle(manifest, { evidenceRoot });

    expect(result.ok).toBe(false);
    expect(result.findings.map((finding) => finding.code)).toContain(
      "evidence_verification_not_ok",
    );
    expect(result.findings.map((finding) => finding.code)).toContain(
      "evidence_verification_not_passed",
    );
  });

  test("blocks final evidence that only points at an uninspectable command summary", async () => {
    const manifest = withChecksum({
      ...completeManifest(),
      evidence: {
        ...completeEvidence(),
        automation: evidence("pass", { path: "local-command-output:typecheck+lint+tests" }),
      },
    });
    const evidenceRoot = await createEvidenceRoot({
      ".omx/artifacts/pass/verification.json": { ok: true, status: "pass" },
    });

    const result = await evaluateReleaseEvidenceBundle(manifest, { evidenceRoot });

    expect(result.ok).toBe(false);
    expect(result.findings.map((finding) => finding.code)).toContain(
      "evidence_path_not_machine_verifiable",
    );
  });

  test("validates extra evidence items beyond the required release checklist", async () => {
    const manifest = withChecksum({
      ...completeManifest(),
      evidence: {
        ...completeEvidence(),
        nativePackageQa: evidence("pass", {
          path: ".omx/artifacts/native-package-qa/verification.json",
        }),
      },
    });
    const evidenceRoot = await createEvidenceRoot({
      ".omx/artifacts/pass/verification.json": { ok: true, status: "pass" },
      ".omx/artifacts/native-package-qa/verification.json": { ok: false, status: "fail" },
    });

    const result = await evaluateReleaseEvidenceBundle(manifest, { evidenceRoot });

    expect(result.ok).toBe(false);
    expect(result.findings.map((finding) => finding.path)).toContain(
      "evidence.nativePackageQa.path",
    );
  });
});

function completeManifest() {
  return {
    schemaVersion: 1,
    qaStatus: "release-ready",
    artifactIdentity: identity(),
    evidence: completeEvidence(),
    releaseBlockers: {
      "DF-REL-001": "closed",
      "DF-UI-001": "closed",
      "DF-QA-002": "closed",
      "DF-QA-003": "closed",
      "DF-E2E-112": "closed",
      "DF-UI-040": "closed",
      "DF-REL-002": "closed",
      "DF-PPT-001": "closed",
      "DF-UAT-001": "closed",
      "DF-SEC-001": "closed",
    },
    signOff: {
      qa: { name: "QA Owner", signedAt: "2026-06-25T14:00:00.000Z" },
      releaseOwner: { name: "Release Owner", signedAt: "2026-06-25T14:05:00.000Z" },
    },
  };
}

function completeEvidence() {
  return {
    releaseArtifact: evidence("pass"),
    automation: evidence("pass"),
    uiContract: evidence("pass"),
    packagedGoldenPath: evidence("pass"),
    section45Interactions: evidence("pass"),
    cleanMachine: evidence("pass"),
    powerPointRoundTrip: evidence("pass"),
    nonDeveloperUat: evidence("pass"),
    secretScan: evidence("pass"),
  };
}

function identity() {
  return {
    gitCommit: "0123456789abcdef0123456789abcdef01234567",
    dirtyWorktree: false,
    version: "1.0.0",
    buildNumber: "1",
    dmgPath: "release-artifacts/DeckForge_1.0.0_aarch64.dmg",
    dmgSha256: "a".repeat(64),
  };
}

function evidence(status, patch = {}) {
  return {
    status,
    path: `.omx/artifacts/${status}/verification.json`,
    dmgSha256: identity().dmgSha256,
    skipped: false,
    unverified: false,
    ...patch,
  };
}

function withChecksum(manifest) {
  return { ...manifest, bundleChecksum: hashManifestForBundle(manifest) };
}

async function createEvidenceRoot(files) {
  const root = await mkdtemp(path.join(os.tmpdir(), "deckforge-release-evidence-"));
  for (const [relativePath, json] of Object.entries(files)) {
    const filePath = path.join(root, relativePath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, `${JSON.stringify(json)}\n`);
  }
  return root;
}
