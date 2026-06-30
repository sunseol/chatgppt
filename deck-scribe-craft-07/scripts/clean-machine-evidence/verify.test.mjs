import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "bun:test";
import { CLEAN_MACHINE_STEPS } from "../../src/lib/production-packaging-evidence.ts";
import { verifyCleanMachineEvidence } from "./verify.mjs";

describe("clean-machine evidence verification", () => {
  test("passes when production packaging and clean-machine artifacts are complete", async () => {
    const fixture = await createFixture();

    const result = await verifyCleanMachineEvidence(fixture.manifestPath);

    expect(result.ok).toBe(true);
    expect(result.status).toBe("pass");
    expect(result.findings).toEqual([]);
    expect(result.checkedFileCount).toBe(4);
  });

  test("blocks when no manifest is provided", async () => {
    const result = await verifyCleanMachineEvidence(null);

    expect(result.ok).toBe(false);
    expect(result.status).toBe("blocked");
    expect(result.findings).toContainEqual({
      code: "missing_manifest",
      path: "manifestPath",
      detail: "",
    });
  });

  test("blocks when clean-machine steps are incomplete", async () => {
    const fixture = await createFixture({
      evidencePatch: { cleanMachineSteps: ["install_app", "codex_login"] },
    });

    const result = await verifyCleanMachineEvidence(fixture.manifestPath);

    expect(result.ok).toBe(false);
    expect(result.findings.map((finding) => finding.code)).toContain("missing_clean_machine_step");
  });

  test("blocks when referenced clean-machine files are missing", async () => {
    const fixture = await createFixture({
      evidencePatch: { runbookPath: "docs/missing-runbook.md" },
    });

    const result = await verifyCleanMachineEvidence(fixture.manifestPath);

    expect(result.ok).toBe(false);
    expect(result.findings).toContainEqual({
      code: "missing_referenced_file",
      path: "evidence.runbookPath",
      detail: "docs/missing-runbook.md",
    });
  });

  test("blocks when runtime remediation is marked shown without machine evidence", async () => {
    const fixture = await createFixture({
      evidencePatch: { runtimeAbsenceRemediationEvidencePath: "runtime-absence/missing.json" },
    });

    const result = await verifyCleanMachineEvidence(fixture.manifestPath);

    expect(result.ok).toBe(false);
    expect(result.findings).toContainEqual({
      code: "missing_runtime_absence_remediation",
      path: "evidence.runtimeAbsenceRemediationEvidencePath",
      detail: "runtime-absence/missing.json",
    });
  });

  test("resolves referenced files from an explicit reference root", async () => {
    const referenceRoot = await mkdtemp(path.join(os.tmpdir(), "deckforge-clean-machine-root-"));
    await writeFixtureFile(referenceRoot, "dist/deckforge-macos-dry-run.tgz", "package");
    await writeFixtureFile(referenceRoot, "release-artifacts/DeckForge_1.0.0_aarch64.dmg", "dmg");
    await writeFixtureFile(referenceRoot, "docs/production-clean-machine-runbook.md", "runbook");
    await writeJson(runtimeRemediationPath(referenceRoot), runtimeRemediationEvidence());
    const manifestRoot = await mkdtemp(path.join(os.tmpdir(), "deckforge-clean-machine-manifest-"));
    const manifestPath = path.join(manifestRoot, "clean-machine.json");
    await writeJson(manifestPath, {
      schemaVersion: 1,
      sourceDmgSha256: "a".repeat(64),
      evidence: completeEvidence(),
    });

    const result = await verifyCleanMachineEvidence(manifestPath, { referenceRoot });

    expect(result.checkedFileCount).toBe(4);
    expect(result.findings.map((finding) => finding.code)).not.toContain("missing_referenced_file");
  });
});

async function createFixture(options = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "deckforge-clean-machine-"));
  await writeFixtureFile(root, "dist/deckforge-macos-dry-run.tgz", "package");
  await writeFixtureFile(root, "release-artifacts/DeckForge_1.0.0_aarch64.dmg", "dmg");
  await writeFixtureFile(root, "docs/production-clean-machine-runbook.md", "runbook");
  await writeJson(runtimeRemediationPath(root), runtimeRemediationEvidence());
  const sourceDmgSha256 = "a".repeat(64);
  const evidence = { ...completeEvidence(), ...options.evidencePatch };
  const manifestPath = path.join(root, "clean-machine.json");
  await writeJson(manifestPath, {
    schemaVersion: 1,
    sourceDmgSha256,
    evidence,
  });
  return { manifestPath };
}

function completeEvidence() {
  return {
    packagePath: "dist/deckforge-macos-dry-run.tgz",
    packageSha256: "b".repeat(64),
    nativeMacosBundlePath: "release-artifacts/DeckForge_1.0.0_aarch64.dmg",
    nativeMacosBundleSha256: "a".repeat(64),
    nativeMacosBundleVerified: true,
    productionMode: true,
    contentScan: {
      mockResourceHits: [],
      fixtureHits: [],
      secretHits: [],
      testFileHits: [],
      localPathHits: [],
    },
    cleanMachineSteps: CLEAN_MACHINE_STEPS,
    runtimeAbsenceRemediationShown: true,
    runtimeAbsenceRemediationEvidencePath: "runtime-absence-remediation/verification.json",
    runbookPath: "docs/production-clean-machine-runbook.md",
  };
}

function runtimeRemediationPath(root) {
  return path.join(root, "runtime-absence-remediation", "verification.json");
}

function runtimeRemediationEvidence() {
  return {
    schemaVersion: 1,
    ok: true,
    status: "pass",
    evidenceKind: "runtime_absence_remediation",
    checks: [],
  };
}

async function writeFixtureFile(root, relativePath, contents) {
  const absolutePath = path.join(root, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, contents);
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}
