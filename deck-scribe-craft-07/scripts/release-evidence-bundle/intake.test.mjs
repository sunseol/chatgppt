import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "bun:test";
import { runReleaseEvidenceIntake } from "./intake.mjs";
import { readReleaseEvidenceManifest } from "./preflight.mjs";
import { writeReleaseEvidenceTemplates } from "./templates.mjs";

describe("release evidence intake", () => {
  test("writes split-ticket verification outputs and a final preflight from a template directory", async () => {
    const templateDir = await mkdtemp(path.join(os.tmpdir(), "deckforge-release-intake-"));
    const fixture = await createDmgFixture(
      templateDir,
      "release-artifacts/DeckForge_0.1.0_aarch64.dmg",
      "fixture dmg bytes",
    );
    await writeReleaseEvidenceTemplates({
      outDir: templateDir,
      sourceDmgSha256: fixture.digest,
      gitCommit: "abc123",
      version: "0.1.0",
      buildNumber: "release-candidate",
      dmgPath: fixture.dmgPath,
      checkedAt: "2026-06-25T12:00:00.000Z",
    });

    const result = await runReleaseEvidenceIntake({ templateDir });

    expect(result.status).toBe("blocked");
    expect(Object.keys(result.ticketStatuses).sort()).toEqual([
      "DF-E2E-112",
      "DF-PPT-001",
      "DF-QA-002",
      "DF-QA-003",
      "DF-REL-001",
      "DF-REL-002",
      "DF-REL-003",
      "DF-SEC-001",
      "DF-UAT-001",
      "DF-UI-001",
      "DF-UI-040",
    ]);
    expect(result.ticketStatuses["DF-UI-001"].issueNumber).toBe(176);
    expect(result.ticketStatuses["DF-QA-002"].issueNumber).toBe(177);
    expect(result.ticketStatuses["DF-QA-003"].issueNumber).toBe(178);
    expect(result.ticketStatuses["DF-UI-040"].issueNumber).toBe(179);
    expect(result.ticketStatuses["DF-E2E-112"].state).toBe("blocked");
    expect(result.ticketStatuses["DF-REL-002"].issueNumber).toBe(171);
    expect(result.ticketStatuses["DF-REL-003"].state).toBe("blocked");
    expect(result.ticketStatuses["DF-SEC-001"].reasonCodes).toContain("qa_status_not_final");

    await expectFile(result.paths.packagedGoldenPathVerification);
    await expectFile(result.paths.cleanMachineVerification);
    await expectFile(result.paths.powerPointRoundTripVerification);
    await expectFile(result.paths.nonDeveloperUatVerification);
    await expectFile(result.paths.secretScanVerification);
    await expectFile(result.paths.releaseEvidenceManifest);
    await expectFile(result.paths.preflightVerification);
    await expectFile(result.paths.ticketStatus);
    await expectFile(result.paths.ticketStatusReport);
    await expectFile(result.paths.ticketIssueComments);
    await expectFile(result.paths.releaseArtifactVerification);

    const manifest = await readReleaseEvidenceManifest(result.paths.releaseEvidenceManifest);
    expect(manifest.evidence.releaseArtifact.path).toBe("release-artifact/verification.json");
    expect(manifest.evidence.releaseArtifact.status).toBe("pass");
    expect(manifest.evidence.packagedGoldenPath.path).toBe(
      "packaged-golden-path/verification.json",
    );
    expect(manifest.evidence.cleanMachine.path).toBe("clean-machine/verification.json");
    expect(manifest.evidence.powerPointRoundTrip.path).toBe(
      "powerpoint-round-trip/verification.json",
    );
    expect(manifest.evidence.nonDeveloperUat.path).toBe("non-developer-uat/verification.json");
    expect(manifest.evidence.secretScan.path).toBe("evidence-secret-scan/verification.json");

    const preflight = JSON.parse(await readFile(result.paths.preflightVerification, "utf8"));
    expect(preflight.status).toBe("blocked");
    expect(preflight.findings.map((finding) => finding.code)).not.toContain(
      "missing_required_evidence",
    );

    const status = JSON.parse(await readFile(result.paths.ticketStatus, "utf8"));
    expect(status.artifactRoot).toBe(templateDir);
    expect(status.ticketStatuses["DF-REL-001"].reasonCodes).toEqual(["dirty_worktree_identity"]);
    expect(status.ticketStatuses["DF-REL-001"].evidencePaths).toEqual([
      "release-artifact/verification.json",
    ]);
    expect(status.ticketStatuses["DF-REL-002"].evidencePaths).toEqual([
      "clean-machine/verification.json",
    ]);
    expect(status.ticketStatuses["DF-REL-003"].evidencePaths).toContain(
      "release-evidence-preflight/verification.json",
    );
    expect(status.ticketStatuses["DF-REL-001"].nextStep).toEqual({
      actor: "release-owner",
      action: "Freeze a clean release candidate artifact identity and rerun intake.",
      closurePolicy: "blocked_do_not_close",
    });
    expect(status.ticketStatuses["DF-REL-001"].githubLabels).toEqual([
      "deckforge-e2e-followup",
      "blocked-do-not-close",
    ]);
    expect(status.ticketStatuses["DF-REL-001"].verification).toEqual({
      rerunCommand: `bun scripts/release-evidence-intake.mjs ${templateDir}`,
      statusPath: `${templateDir}/split-ticket-status.json`,
    });
    expect(status.ticketStatuses["DF-REL-003"].nextStep).toEqual({
      actor: "qa-and-release-owner",
      action:
        "Close all blocker tickets, add QA and release-owner sign-off, then rerun final preflight.",
      closurePolicy: "blocked_do_not_close",
    });

    const comments = JSON.parse(await readFile(result.paths.ticketIssueComments, "utf8"));
    expect(comments["DF-REL-003"].issueNumber).toBe(175);
    expect(comments["DF-REL-003"].body).toContain("Do not close this issue yet.");
  });

  test("attaches local candidate UI and interaction verification files to split tickets", async () => {
    const templateDir = await mkdtemp(path.join(os.tmpdir(), "deckforge-release-intake-"));
    const fixture = await createDmgFixture(
      templateDir,
      "release-artifacts/DeckForge_0.1.0_aarch64.dmg",
      "fixture dmg bytes",
    );
    await writeReleaseEvidenceTemplates({
      outDir: templateDir,
      sourceDmgSha256: fixture.digest,
      gitCommit: "abc123",
      version: "0.1.0",
      buildNumber: "release-candidate",
      dmgPath: fixture.dmgPath,
      checkedAt: "2026-06-25T12:00:00.000Z",
    });
    const verificationDir = await mkdtemp(path.join(os.tmpdir(), "deckforge-release-intake-ok-"));
    const uiVerificationPath = await writeVerification(
      path.join(verificationDir, "ui-verification.json"),
      { ok: true, status: "pass", expectedCount: 40, checkedResultCount: 40, findings: [] },
    );
    const productionVerificationPath = await writeVerification(
      path.join(verificationDir, "production-ui-verification.json"),
      { ok: true, status: "pass", interactionCount: 10, checkedFileCount: 73, findings: [] },
    );

    const result = await runReleaseEvidenceIntake({
      templateDir,
      uiContractVerificationPath: uiVerificationPath,
      automationVerificationPath: productionVerificationPath,
      section45VerificationPath: productionVerificationPath,
    });

    expect(result.ticketStatuses["DF-UI-001"].state).toBe("close-candidate");
    expect(result.ticketStatuses["DF-UI-040"].state).toBe("close-candidate");
    expect(result.ticketStatuses["DF-QA-002"].state).toBe("close-candidate");
    expect(result.ticketStatuses["DF-QA-003"].state).toBe("close-candidate");
    expect(result.ticketStatuses["DF-QA-002"].nextStep).toEqual({
      actor: "human-reviewer",
      action:
        "Review the linked verification JSON, attach the evidence to the GitHub issue, then close after human review.",
      closurePolicy: "human_review_required",
    });
    expect(result.ticketStatuses["DF-QA-002"].githubLabels).toEqual([
      "deckforge-e2e-followup",
      "human-review-required",
    ]);
    expect(result.ticketStatuses["DF-QA-002"].verification.rerunCommand).toContain(
      `bun scripts/release-evidence-intake.mjs ${templateDir}`,
    );
    expect(result.ticketStatuses["DF-QA-002"].verification.rerunCommand).toContain(
      `--ui-contract-verification ${uiVerificationPath}`,
    );
    expect(result.ticketStatuses["DF-QA-002"].verification.rerunCommand).toContain(
      `--automation-verification ${productionVerificationPath}`,
    );
    expect(result.ticketStatuses["DF-QA-002"].verification.rerunCommand).toContain(
      `--section45-verification ${productionVerificationPath}`,
    );
    await expectFile(result.paths.uiContractVerification);
    await expectFile(result.paths.automationVerification);
    await expectFile(result.paths.section45Verification);

    const manifest = await readReleaseEvidenceManifest(result.paths.releaseEvidenceManifest);
    expect(manifest.evidence.uiContract.status).toBe("pass");
    expect(manifest.evidence.uiContract.path).toBe("gppt-ui-contract/verification.json");
    expect(manifest.evidence.automation.status).toBe("pass");
    expect(manifest.evidence.automation.path).toBe("production-ui-e2e/verification.json");
    expect(manifest.evidence.section45Interactions.status).toBe("pass");
    expect(manifest.evidence.section45Interactions.path).toBe("section45/verification.json");
  });
});

async function createDmgFixture(root, fileName, contents) {
  const dmgPath = path.join(root, fileName);
  await mkdir(path.dirname(dmgPath), { recursive: true });
  await writeFile(dmgPath, contents);
  const digest = createHash("sha256").update(contents).digest("hex");
  await writeFile(`${dmgPath}.sha256`, `${digest}  ${fileName}\n`);
  return { dmgPath, digest };
}

async function writeVerification(filePath, verification) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(verification, null, 2)}\n`);
  return filePath;
}

async function expectFile(filePath) {
  const info = await stat(filePath);
  expect(info.isFile()).toBe(true);
}
