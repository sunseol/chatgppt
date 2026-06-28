#!/usr/bin/env bun

import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeReleaseEvidenceTemplates } from "./release-evidence-bundle/templates.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const outDir = path.resolve(
  root,
  readOption("--out-dir") ??
    process.env.DECKFORGE_RELEASE_EVIDENCE_TEMPLATE_OUT_DIR ??
    `.omx/artifacts/release-evidence-templates-${Date.now()}`,
);

const result = await writeReleaseEvidenceTemplates({
  outDir,
  sourceDmgSha256:
    readOption("--source-dmg-sha256") ??
    process.env.DECKFORGE_RELEASE_EVIDENCE_TEMPLATE_DMG_SHA256 ??
    "",
  gitCommit: readOption("--git-commit") ?? process.env.DECKFORGE_RELEASE_EVIDENCE_GIT_COMMIT,
  version: readOption("--version") ?? process.env.DECKFORGE_RELEASE_EVIDENCE_VERSION,
  buildNumber: readOption("--build-number") ?? process.env.DECKFORGE_RELEASE_EVIDENCE_BUILD_NUMBER,
  dmgPath: readOption("--dmg-path") ?? process.env.DECKFORGE_RELEASE_EVIDENCE_DMG_PATH,
  productionPackageSha256:
    readOption("--production-package-sha256") ??
    process.env.DECKFORGE_RELEASE_EVIDENCE_PRODUCTION_PACKAGE_SHA256,
  nativeMacosBundlePath:
    readOption("--native-macos-bundle-path") ??
    process.env.DECKFORGE_RELEASE_EVIDENCE_NATIVE_MACOS_BUNDLE_PATH,
  nativeMacosBundleVerified: readBooleanOption(
    "--native-macos-bundle-verified",
    "DECKFORGE_RELEASE_EVIDENCE_NATIVE_MACOS_BUNDLE_VERIFIED",
  ),
  runtimeAbsenceRemediationShown: readBooleanOption(
    "--runtime-absence-remediation-shown",
    "DECKFORGE_RELEASE_EVIDENCE_RUNTIME_ABSENCE_REMEDIATION_SHOWN",
  ),
  runtimeAbsenceRemediationEvidencePath:
    readOption("--runtime-absence-remediation-evidence") ??
    process.env.DECKFORGE_RELEASE_EVIDENCE_RUNTIME_ABSENCE_REMEDIATION_EVIDENCE,
});

console.log(JSON.stringify(result, null, 2));

function readOption(name) {
  const prefix = `${name}=`;
  const option = args.find((arg) => arg.startsWith(prefix));
  if (option) return option.slice(prefix.length);
  const index = args.indexOf(name);
  if (index >= 0) return args[index + 1] ?? null;
  return null;
}

function readBooleanOption(name, envName) {
  const value = readOption(name) ?? process.env[envName];
  if (value === null || value === undefined) return undefined;
  return value === "1" || value === "true";
}
