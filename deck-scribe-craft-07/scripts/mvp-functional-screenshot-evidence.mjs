#!/usr/bin/env bun

import { writeMvpFunctionalScreenshotEvidenceVerification } from "./mvp-functional-screenshot-evidence/verify.mjs";

const bundleDir = process.argv[2];
if (!bundleDir) {
  console.error(
    "Usage: bun scripts/mvp-functional-screenshot-evidence.mjs <production-ui-e2e-bundle-dir>",
  );
  process.exit(2);
}

const verification = await writeMvpFunctionalScreenshotEvidenceVerification(bundleDir);
console.log(JSON.stringify(verification, null, 2));
if (!verification.ok) process.exit(1);
