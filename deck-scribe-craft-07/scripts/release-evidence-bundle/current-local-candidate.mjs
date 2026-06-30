#!/usr/bin/env bun

import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateReleaseEvidenceBundle, hashManifestForBundle } from "./preflight.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const artifactsDir = path.join(root, ".omx", "artifacts");
const outDir = path.resolve(
  root,
  process.env.DECKFORGE_RELEASE_EVIDENCE_PREFLIGHT_OUT_DIR ??
    `.omx/artifacts/release-evidence-preflight-${Date.now()}`,
);
await mkdir(outDir, { recursive: true });

const releaseArtifactPath = await latestVerification("release-artifact-checksum");
const nativePackageQaPath = await latestNativePackageQaVerification();
const gatekeeperAssessmentPath = await latestVerification("gatekeeper-assessment");
const packagedGoldenPathPath = await latestVerification("packaged-golden-path");
const cleanMachinePath = await latestVerification("clean-machine");
const uiContractPath = await latestVerification("gppt-ui-contract");
const section45Path = await latestVerification("production-ui-e2e");
const powerPointRoundTripPath = await latestVerification("powerpoint-round-trip");
const nonDeveloperUatPath = await latestVerification("non-developer-uat");
const visualCouncilPath = await latestVerification("visual-release-council");
const secretScanPath = await latestVerification("evidence-secret-scan");
const releaseArtifact = await readJson(releaseArtifactPath);
const gatekeeperAssessment = await readJson(gatekeeperAssessmentPath);
const packagedGoldenPath = await readJson(packagedGoldenPathPath);
const cleanMachine = await readJson(cleanMachinePath);
const powerPointRoundTrip = await readJson(powerPointRoundTripPath);
const nonDeveloperUat = await readJson(nonDeveloperUatPath);
const visualCouncil = await readJson(visualCouncilPath);
const dmgSha256 = releaseArtifact?.actualHash ?? "";
const manifest = {
  schemaVersion: 1,
  qaStatus: "local-candidate",
  artifactIdentity: {
    gitCommit: "dirty-local-worktree",
    dirtyWorktree: true,
    version: "0.0.0.15",
    buildNumber: "15",
    dmgPath: "release-artifacts/DeckForge_0.0.0.15_aarch64.dmg",
    dmgSha256,
  },
  evidence: {
    releaseArtifact: evidence(releaseArtifactPath, dmgSha256),
    nativePackageQa: evidence(nativePackageQaPath, dmgSha256),
    gatekeeperAssessment: evidence(gatekeeperAssessmentPath, dmgSha256, {
      status: gatekeeperAssessment?.ok === true ? "pass" : "blocked",
    }),
    automation: evidence("local-command-output:typecheck+lint+tests", dmgSha256),
    uiContract: evidence(uiContractPath, dmgSha256),
    packagedGoldenPath: evidence(packagedGoldenPathPath, dmgSha256, {
      status: packagedGoldenPath?.ok === true ? "pass" : "blocked",
    }),
    section45Interactions: evidence(section45Path, dmgSha256),
    cleanMachine: evidence(cleanMachinePath, dmgSha256, {
      status: cleanMachine?.ok === true ? "pass" : "blocked",
    }),
    powerPointRoundTrip: evidence(powerPointRoundTripPath, dmgSha256, {
      status: powerPointRoundTrip?.ok === true ? "pass" : "blocked",
    }),
    nonDeveloperUat: evidence(nonDeveloperUatPath, dmgSha256, {
      status: nonDeveloperUat?.ok === true ? "pass" : "blocked",
    }),
    visualCouncil: evidence(visualCouncilPath, dmgSha256, {
      status: visualCouncil?.ok === true ? "pass" : "blocked",
    }),
    secretScan: evidence(secretScanPath, dmgSha256),
  },
  releaseBlockers: {
    "DF-REL-001": "open",
    "DF-E2E-112": "open",
    "DF-REL-002": "open",
    "DF-PPT-001": "open",
    "DF-UAT-001": "open",
    "DF-SEC-001": "open",
    "DF-REL-003": "open",
  },
  signOff: {},
};
manifest.bundleChecksum = hashManifestForBundle(manifest);

const verification = await evaluateReleaseEvidenceBundle(manifest, { evidenceRoot: root });
await writeFile(path.join(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(
  path.join(outDir, "verification.json"),
  `${JSON.stringify(verification, null, 2)}\n`,
);
console.log(JSON.stringify({ ...verification, outDir }, null, 2));

async function readJson(relativePath) {
  try {
    return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
  } catch {
    return null;
  }
}

async function latestVerification(prefix) {
  const entries = await readdir(artifactsDir, { withFileTypes: true });
  const matches = entries
    .filter((entry) => entry.isDirectory() && new RegExp(`^${prefix}-\\d+$`).test(entry.name))
    .map((entry) => entry.name)
    .sort()
    .reverse();
  for (const name of matches) {
    const verificationPath = path.join(".omx", "artifacts", name, "verification.json");
    try {
      const info = await stat(path.join(root, verificationPath));
      if (info.isFile()) return verificationPath;
    } catch {
      // Keep searching older artifacts.
    }
  }
  return path.join(".omx", "artifacts", `${prefix}-missing`, "verification.json");
}

async function latestNativePackageQaVerification() {
  const entries = await readdir(artifactsDir, { withFileTypes: true });
  const matches = entries
    .filter(
      (entry) => entry.isDirectory() && /^native-package-qa(?:-launch)?-\d+$/.test(entry.name),
    )
    .map((entry) => entry.name)
    .sort()
    .reverse();
  for (const name of matches) {
    const verificationPath = path.join(".omx", "artifacts", name, "verification.json");
    try {
      const info = await stat(path.join(root, verificationPath));
      if (info.isFile()) return verificationPath;
    } catch {
      // Keep searching older artifacts.
    }
  }
  return path.join(".omx", "artifacts", "native-package-qa-missing", "verification.json");
}

function evidence(evidencePath, dmgSha256, patch = {}) {
  return {
    status: "pass",
    path: evidencePath,
    dmgSha256,
    skipped: false,
    unverified: false,
    ...patch,
  };
}
