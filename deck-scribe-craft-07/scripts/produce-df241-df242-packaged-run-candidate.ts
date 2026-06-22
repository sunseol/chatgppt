import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { buildDf241Df242CandidateEvidence } from "./df241-df242-candidate-evidence-support";
import {
  parseDf241Df242PackagedRunInput,
  produceDf241Df242PackagedEvidence,
} from "./df241-df242-packaged-evidence-producer";

const DEFAULT_OUTPUT_PATH =
  "docs/live-evidence/release/df241-df242-packaged-run-candidate-20260622.json";
const DEFAULT_CAPTURED_AT = "2026-06-22T02:30:00.000Z";
const DEFAULT_PACKAGE_SHA = "79558b1114d295ddd80fa8068818aeb5bb6b74b4b4b0335981f057824e997163";

const [outputPath = DEFAULT_OUTPUT_PATH, capturedAt = DEFAULT_CAPTURED_AT] = process.argv.slice(2);
const packageArchiveSha256 = process.env.DF241_DF242_PACKAGE_SHA ?? DEFAULT_PACKAGE_SHA;
const candidate = buildDf241Df242CandidateEvidence({ packageArchiveSha256 });
const input = parseDf241Df242PackagedRunInput({
  capturedAt,
  packageArchiveSha256,
  goldenPathBundle: candidate.goldenPathBundle,
  benchmarkBundle: candidate.benchmarkBundle,
});
const evidence = produceDf241Df242PackagedEvidence(input);

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`${outputPath} ${evidence.status}`);
