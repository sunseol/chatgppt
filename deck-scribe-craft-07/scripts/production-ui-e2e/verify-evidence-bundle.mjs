#!/usr/bin/env bun

import { writeProductionE2eVerification } from "./evidence-validator.mjs";

const bundleDir = process.argv[2];
if (!bundleDir) {
  console.error("Usage: bun scripts/production-ui-e2e/verify-evidence-bundle.mjs <bundle-dir>");
  process.exit(2);
}

const verification = await writeProductionE2eVerification(bundleDir);
console.log(JSON.stringify(verification, null, 2));
if (!verification.ok) process.exitCode = 1;
