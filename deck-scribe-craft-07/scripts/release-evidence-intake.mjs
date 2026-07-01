#!/usr/bin/env bun

import path from "node:path";
import { fileURLToPath } from "node:url";
import { runReleaseEvidenceIntake } from "./release-evidence-bundle/intake.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const templateDir = readOption("--template-dir") ?? args.find((arg) => !arg.startsWith("--"));
if (!templateDir) {
  console.error("Usage: bun scripts/release-evidence-intake.mjs --template-dir <dir>");
  process.exit(1);
}

const result = await runReleaseEvidenceIntake({
  templateDir: path.resolve(root, templateDir),
  expectedDmgSha256:
    readOption("--expected-dmg-sha256") ?? process.env.DECKFORGE_RELEASE_EVIDENCE_INTAKE_DMG_SHA256,
  uiContractVerificationPath:
    readOption("--ui-contract-verification") ??
    process.env.DECKFORGE_RELEASE_EVIDENCE_UI_CONTRACT_VERIFICATION,
  automationVerificationPath:
    readOption("--automation-verification") ??
    process.env.DECKFORGE_RELEASE_EVIDENCE_AUTOMATION_VERIFICATION,
  section45VerificationPath:
    readOption("--section45-verification") ??
    process.env.DECKFORGE_RELEASE_EVIDENCE_SECTION45_VERIFICATION,
});

console.log(JSON.stringify(result, null, 2));
if (result.status !== "ready") process.exitCode = 1;

function readOption(name) {
  const prefix = `${name}=`;
  const option = args.find((arg) => arg.startsWith(prefix));
  if (option) return option.slice(prefix.length);
  const index = args.indexOf(name);
  if (index >= 0) return args[index + 1] ?? null;
  return null;
}
