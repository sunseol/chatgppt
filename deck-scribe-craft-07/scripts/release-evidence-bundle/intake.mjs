import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { verifyCleanMachineEvidence } from "../clean-machine-evidence/verify.mjs";
import { scanEvidenceSecrets } from "../evidence-secret-scan/scan.mjs";
import { verifyNonDeveloperUatEvidence } from "../non-developer-uat-evidence/verify.mjs";
import { verifyPackagedGoldenPathEvidence } from "../packaged-golden-path-evidence/verify.mjs";
import { verifyPowerPointRoundTripManifest } from "../powerpoint-round-trip-evidence/verify.mjs";
import { verifyReleaseArtifactEvidence } from "../release-artifact/evidence.mjs";
import { attachOptionalVerification, optionalEvidenceItem } from "./intake-attachments.mjs";
import { releaseTemplatePaths } from "./intake-paths.mjs";
import { evaluateReleaseEvidenceBundle, hashManifestForBundle } from "./preflight.mjs";
import { buildSplitTicketIssueComments, buildSplitTicketStatusReport } from "./status-report.mjs";
import { splitTicketStatuses } from "./ticket-statuses.mjs";

export async function runReleaseEvidenceIntake(options) {
  const templateDir = path.resolve(options.templateDir);
  const expectedDmgSha256 = options.expectedDmgSha256 ?? null;
  const templatePaths = releaseTemplatePaths(templateDir);

  const packagedGoldenPath = await verifyPackagedGoldenPathEvidence(
    templatePaths.packagedGoldenPathManifest,
    { expectedDmgSha256 },
  );
  const cleanMachine = await verifyCleanMachineEvidence(templatePaths.cleanMachineManifest, {
    expectedDmgSha256,
    referenceRoot: process.cwd(),
  });
  const powerPointRoundTrip = await verifyPowerPointRoundTripManifest(
    templatePaths.powerPointRoundTripManifest,
    { expectedDmgSha256 },
  );
  const nonDeveloperUat = await verifyNonDeveloperUatEvidence(
    templatePaths.nonDeveloperUatManifest,
    { expectedDmgSha256 },
  );

  await writeJson(templatePaths.packagedGoldenPathVerification, packagedGoldenPath);
  await writeJson(templatePaths.cleanMachineVerification, cleanMachine);
  await writeJson(templatePaths.powerPointRoundTripVerification, powerPointRoundTrip);
  await writeJson(templatePaths.nonDeveloperUatVerification, nonDeveloperUat);
  const uiContract = await attachOptionalVerification({
    sourcePath: options.uiContractVerificationPath,
    outPath: templatePaths.uiContractVerification,
    writeJson,
  });
  const automation = await attachOptionalVerification({
    sourcePath: options.automationVerificationPath,
    outPath: templatePaths.automationVerification,
    writeJson,
  });
  const section45Interactions = await attachOptionalVerification({
    sourcePath: options.section45VerificationPath,
    outPath: templatePaths.section45Verification,
    writeJson,
  });

  const secretScan = await scanEvidenceSecrets([templateDir]);
  await writeJson(templatePaths.secretScanVerification, {
    ...secretScan,
    outDir: path.dirname(templatePaths.secretScanVerification),
  });

  const releaseManifest = JSON.parse(await readFile(templatePaths.releaseEvidenceTemplate, "utf8"));
  const releaseArtifact = verifyReleaseArtifactEvidence(releaseManifest);
  await writeJson(templatePaths.releaseArtifactVerification, releaseArtifact);
  const intakeManifest = withEvidenceIntake(releaseManifest, {
    releaseArtifact,
    uiContract,
    automation,
    section45Interactions,
    packagedGoldenPath,
    cleanMachine,
    powerPointRoundTrip,
    nonDeveloperUat,
    secretScan,
  });
  intakeManifest.bundleChecksum = hashManifestForBundle(intakeManifest);
  await writeJson(templatePaths.releaseEvidenceManifest, intakeManifest);

  const preflight = await evaluateReleaseEvidenceBundle(intakeManifest, {
    evidenceRoot: templateDir,
  });
  await writeJson(templatePaths.preflightVerification, preflight);

  const artifactRoot = artifactRootForReport(templateDir);
  const ticketStatuses = withTicketVerification(
    splitTicketStatuses({
      releaseManifest: intakeManifest,
      packagedGoldenPath,
      cleanMachine,
      powerPointRoundTrip,
      nonDeveloperUat,
      secretScan,
      preflight,
    }),
    {
      artifactRoot,
      expectedDmgSha256,
      uiContractVerificationPath: options.uiContractVerificationPath,
      automationVerificationPath: options.automationVerificationPath,
      section45VerificationPath: options.section45VerificationPath,
    },
  );
  const ticketStatusDocument = {
    schemaVersion: 1,
    status: preflight.ok ? "ready" : "blocked",
    checkedAt: preflight.checkedAt,
    artifactRoot,
    ticketStatuses,
  };
  await writeJson(templatePaths.ticketStatus, ticketStatusDocument);
  await writeFile(
    templatePaths.ticketStatusReport,
    buildSplitTicketStatusReport(ticketStatusDocument),
  );
  await writeJson(
    templatePaths.ticketIssueComments,
    buildSplitTicketIssueComments(ticketStatusDocument),
  );

  return {
    status: preflight.ok ? "ready" : "blocked",
    paths: templatePaths,
    ticketStatuses,
  };
}

function artifactRootForReport(templateDir) {
  const relative = path.relative(process.cwd(), templateDir);
  if (relative && !relative.startsWith("..") && !path.isAbsolute(relative)) return relative;
  return templateDir;
}

function withTicketVerification(ticketStatuses, options) {
  const verification = {
    rerunCommand: releaseEvidenceIntakeCommand(options),
    statusPath: artifactPath(options.artifactRoot, "split-ticket-status.json"),
  };
  return Object.fromEntries(
    Object.entries(ticketStatuses).map(([ticket, status]) => [
      ticket,
      {
        ...status,
        verification,
      },
    ]),
  );
}

function releaseEvidenceIntakeCommand(options) {
  const args = ["bun", "scripts/release-evidence-intake.mjs", options.artifactRoot];
  appendOption(args, "--expected-dmg-sha256", options.expectedDmgSha256);
  appendOption(args, "--ui-contract-verification", options.uiContractVerificationPath);
  appendOption(args, "--automation-verification", options.automationVerificationPath);
  appendOption(args, "--section45-verification", options.section45VerificationPath);
  return args.map(shellArg).join(" ");
}

function appendOption(args, flag, value) {
  if (value) args.push(flag, value);
}

function artifactPath(root, fileName) {
  if (root === "." || root === "") return fileName;
  return `${root.replace(/\/$/, "")}/${fileName}`;
}

function shellArg(value) {
  if (/^[A-Za-z0-9_./:=@+-]+$/.test(value)) return value;
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function withEvidenceIntake(manifest, verifications) {
  const evidence = { ...(manifest.evidence ?? {}) };
  evidence.releaseArtifact = evidenceItem(verifications.releaseArtifact);
  evidence.uiContract = optionalEvidenceItem({
    verification: verifications.uiContract,
    relativePath: "gppt-ui-contract/verification.json",
    dmgSha256: manifest.artifactIdentity?.dmgSha256 ?? "",
    fallback: evidence.uiContract,
  });
  evidence.automation = optionalEvidenceItem({
    verification: verifications.automation,
    relativePath: "production-ui-e2e/verification.json",
    dmgSha256: manifest.artifactIdentity?.dmgSha256 ?? "",
    fallback: evidence.automation,
  });
  evidence.section45Interactions = optionalEvidenceItem({
    verification: verifications.section45Interactions,
    relativePath: "section45/verification.json",
    dmgSha256: manifest.artifactIdentity?.dmgSha256 ?? "",
    fallback: evidence.section45Interactions,
  });
  evidence.packagedGoldenPath = evidenceItem(verifications.packagedGoldenPath);
  evidence.cleanMachine = evidenceItem(verifications.cleanMachine);
  evidence.powerPointRoundTrip = evidenceItem(verifications.powerPointRoundTrip);
  evidence.nonDeveloperUat = evidenceItem(verifications.nonDeveloperUat);
  evidence.secretScan = {
    status: verifications.secretScan.ok ? "pass" : "blocked",
    path: "evidence-secret-scan/verification.json",
    dmgSha256: manifest.artifactIdentity?.dmgSha256 ?? "",
  };
  return { ...manifest, evidence, bundleChecksum: "" };
}

function evidenceItem(verification) {
  const pathByKey = {
    releaseArtifact: "release-artifact/verification.json",
    packagedGoldenPath: "packaged-golden-path/verification.json",
    cleanMachine: "clean-machine/verification.json",
    powerPointRoundTrip: "powerpoint-round-trip/verification.json",
    nonDeveloperUat: "non-developer-uat/verification.json",
  };
  return {
    status: verification.ok ? "pass" : "blocked",
    path: pathByKey[verificationKey(verification)],
    dmgSha256: verification.sourceDmgSha256 ?? "",
  };
}

function verificationKey(verification) {
  if ("checksumPathEntry" in verification) return "releaseArtifact";
  if ("completedStepCount" in verification) return "packagedGoldenPath";
  if ("pptxSha256" in verification) return "powerPointRoundTrip";
  if (verification.manifestPath?.includes("non-developer-uat")) return "nonDeveloperUat";
  return "cleanMachine";
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}
