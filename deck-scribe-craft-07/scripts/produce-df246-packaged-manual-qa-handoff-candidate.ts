import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { produceDf246PackagedManualQaEvidence } from "./df246-packaged-manual-qa-evidence-producer";
import {
  CURRENT_DF246_PACKAGE_RECHECK_PATH,
  buildDf246PackagedManualQaInputFromReleaseHandoff,
  parseDf246PackageRecheckEvidenceJson,
} from "./df246-packaged-manual-qa-handoff-ingestion";

const DEFAULT_CAPTURED_AT = "2026-06-22T07:10:00.000Z";
const DEFAULT_OUTPUT_PATH =
  "docs/live-evidence/release/df246-packaged-manual-qa-handoff-candidate-20260622.json";

const [
  packageRecheckPath = CURRENT_DF246_PACKAGE_RECHECK_PATH,
  outputPath = DEFAULT_OUTPUT_PATH,
  capturedAt = DEFAULT_CAPTURED_AT,
] = process.argv.slice(2);

const packageRecheck = parseDf246PackageRecheckEvidenceJson(
  await readFile(packageRecheckPath, "utf8"),
);
const input = buildDf246PackagedManualQaInputFromReleaseHandoff({
  capturedAt,
  packageRecheck,
});
const evidence = produceDf246PackagedManualQaEvidence(input);

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`${outputPath} ${evidence.status}`);
