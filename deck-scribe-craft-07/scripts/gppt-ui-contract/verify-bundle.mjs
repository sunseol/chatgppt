#!/usr/bin/env bun

import { writeGpptUiContractVerification } from "./verification.mjs";

const bundleDir = process.argv[2];
if (!bundleDir) {
  console.error("Usage: bun scripts/gppt-ui-contract/verify-bundle.mjs <bundle-dir>");
  process.exit(1);
}

const verification = await writeGpptUiContractVerification(bundleDir);
console.log(JSON.stringify(verification, null, 2));
if (!verification.ok) process.exit(1);
