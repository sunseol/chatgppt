import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "bun:test";
import { verifyCleanMachineEvidence } from "../clean-machine-evidence/verify.mjs";
import { verifyNonDeveloperUatEvidence } from "../non-developer-uat-evidence/verify.mjs";
import { verifyPackagedGoldenPathEvidence } from "../packaged-golden-path-evidence/verify.mjs";
import { verifyPowerPointRoundTripManifest } from "../powerpoint-round-trip-evidence/verify.mjs";
import { evaluateReleaseEvidenceBundle, readReleaseEvidenceManifest } from "./preflight.mjs";
import { writeReleaseEvidenceTemplates } from "./templates.mjs";

describe("release evidence manifest templates", () => {
  test("writes validator-consumable templates for the split external gates", async () => {
    const outDir = await mkdtemp(path.join(os.tmpdir(), "deckforge-release-evidence-templates-"));
    const sourceDmgSha256 = "a".repeat(64);

    const result = await writeReleaseEvidenceTemplates({
      outDir,
      sourceDmgSha256,
      gitCommit: "abc123",
      version: "0.1.0",
      buildNumber: "release-candidate",
      dmgPath: "release-artifacts/DeckForge_0.1.0_aarch64.dmg",
      checkedAt: "2026-06-25T12:00:00.000Z",
    });

    expect(result.files.map((file) => file.kind).sort()).toEqual([
      "clean-machine",
      "issue-map",
      "non-developer-uat",
      "packaged-golden-path",
      "powerpoint-round-trip",
      "release-evidence",
    ]);

    const packaged = await verifyPackagedGoldenPathEvidence(result.paths.packagedGoldenPath);
    const cleanMachine = await verifyCleanMachineEvidence(result.paths.cleanMachine);
    const powerPoint = await verifyPowerPointRoundTripManifest(result.paths.powerPointRoundTrip);
    const uat = await verifyNonDeveloperUatEvidence(result.paths.nonDeveloperUat);

    for (const verification of [packaged, cleanMachine, powerPoint, uat]) {
      expect(verification.status).toBe("blocked");
      expect(verification.sourceDmgSha256).toBe(sourceDmgSha256);
      expect(verification.findings.map((finding) => finding.code)).not.toContain(
        "missing_manifest",
      );
    }

    const manifest = await readReleaseEvidenceManifest(result.paths.releaseEvidence);
    const preflight = await evaluateReleaseEvidenceBundle(manifest, { evidenceRoot: outDir });

    expect(Object.keys(manifest.evidence).sort()).toEqual([
      "automation",
      "cleanMachine",
      "nonDeveloperUat",
      "packagedGoldenPath",
      "powerPointRoundTrip",
      "releaseArtifact",
      "secretScan",
      "section45Interactions",
      "uiContract",
    ]);
    expect(preflight.status).toBe("blocked");
    expect(preflight.findings.map((finding) => finding.code)).not.toContain(
      "missing_required_evidence",
    );
  });

  test("records the split GitHub issue map next to generated templates", async () => {
    const outDir = await mkdtemp(path.join(os.tmpdir(), "deckforge-release-evidence-templates-"));

    const result = await writeReleaseEvidenceTemplates({
      outDir,
      sourceDmgSha256: "b".repeat(64),
      checkedAt: "2026-06-25T12:00:00.000Z",
    });

    const issueMap = JSON.parse(await readFile(result.paths.issueMap, "utf8"));

    expect(issueMap.parentIssue).toBe(168);
    expect(issueMap.splitIssues["DF-REL-001"]).toBe(169);
    expect(issueMap.splitIssues["DF-UI-001"]).toBe(176);
    expect(issueMap.splitIssues["DF-QA-002"]).toBe(177);
    expect(issueMap.splitIssues["DF-QA-003"]).toBe(178);
    expect(issueMap.splitIssues["DF-E2E-112"]).toBe(170);
    expect(issueMap.splitIssues["DF-UI-040"]).toBe(179);
    expect(issueMap.splitIssues["DF-REL-003"]).toBe(175);
    expect(issueMap.dependencies["DF-QA-002"]).toEqual(["DF-UI-001", "DF-REL-001"]);
    expect(issueMap.dependencies["DF-E2E-112"]).toEqual([
      "DF-REL-001",
      "DF-UI-001",
      "DF-QA-002",
      "DF-QA-003",
    ]);
    expect(issueMap.dependencies["DF-REL-003"]).toEqual([
      "DF-REL-001",
      "DF-UI-001",
      "DF-QA-002",
      "DF-QA-003",
      "DF-E2E-112",
      "DF-UI-040",
      "DF-REL-002",
      "DF-PPT-001",
      "DF-UAT-001",
      "DF-SEC-001",
    ]);
  });

  test("records the production package sha256 in the clean-machine template", async () => {
    const outDir = await mkdtemp(path.join(os.tmpdir(), "deckforge-release-evidence-templates-"));
    const productionPackageSha256 = "c".repeat(64);

    const result = await writeReleaseEvidenceTemplates({
      outDir,
      sourceDmgSha256: "b".repeat(64),
      productionPackageSha256,
    });

    const cleanMachine = JSON.parse(await readFile(result.paths.cleanMachine, "utf8"));

    expect(cleanMachine.evidence.packageSha256).toBe(productionPackageSha256);
  });

  test("records the native macOS bundle path and verification state", async () => {
    const outDir = await mkdtemp(path.join(os.tmpdir(), "deckforge-release-evidence-templates-"));
    const nativeMacosBundlePath =
      "src-tauri/target/release/bundle/dmg/DeckForge_0.0.15_aarch64.dmg";

    const result = await writeReleaseEvidenceTemplates({
      outDir,
      sourceDmgSha256: "d".repeat(64),
      nativeMacosBundlePath,
      nativeMacosBundleVerified: true,
    });

    const cleanMachine = JSON.parse(await readFile(result.paths.cleanMachine, "utf8"));

    expect(cleanMachine.evidence.nativeMacosBundlePath).toBe(nativeMacosBundlePath);
    expect(cleanMachine.evidence.nativeMacosBundleVerified).toBe(true);
  });

  test("records runtime absence remediation evidence when supplied", async () => {
    const outDir = await mkdtemp(path.join(os.tmpdir(), "deckforge-release-evidence-templates-"));
    const evidencePath =
      ".omx/artifacts/release-evidence-templates-current/runtime-absence-remediation/verification.json";

    const result = await writeReleaseEvidenceTemplates({
      outDir,
      sourceDmgSha256: "e".repeat(64),
      runtimeAbsenceRemediationShown: true,
      runtimeAbsenceRemediationEvidencePath: evidencePath,
    });

    const cleanMachine = JSON.parse(await readFile(result.paths.cleanMachine, "utf8"));

    expect(cleanMachine.evidence.runtimeAbsenceRemediationShown).toBe(true);
    expect(cleanMachine.evidence.runtimeAbsenceRemediationEvidencePath).toBe(evidencePath);
  });
});
