import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  buildCurrentDf247ReleaseGateEvidenceInput,
  CURRENT_DF247_PACKAGED_INDEX_PATH,
  CURRENT_DF247_SHA256_EVIDENCE_FILES,
  type CurrentDf247EvidenceFile,
  type CurrentDf247EvidenceSha256Reference,
} from "./df247-current-release-gate-evidence";
import { produceDf247ReleaseGateEvidence } from "./df247-release-gate-evidence-producer";
import { parseDf247PackagedLiveEvidenceIndexJson } from "./df247-release-gate-evidence-schema";

const DEFAULT_OUTPUT_PATH = "docs/live-evidence/release/df247-evidence.json";
const [outputPath = DEFAULT_OUTPUT_PATH, capturedAt = new Date().toISOString()] =
  process.argv.slice(2);

const packagedIndex = parseDf247PackagedLiveEvidenceIndexJson(
  await readFile(CURRENT_DF247_PACKAGED_INDEX_PATH, "utf8"),
);
const currentEvidenceSha256 = await Promise.all(
  CURRENT_DF247_SHA256_EVIDENCE_FILES.map(readEvidenceSha256),
);
const input = buildCurrentDf247ReleaseGateEvidenceInput({
  capturedAt,
  packagedLiveEvidenceIndex: packagedIndex,
  currentEvidenceSha256,
});
const evidence = produceDf247ReleaseGateEvidence(input);
const payload = `${JSON.stringify(evidence, null, 2)}\n`;

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, payload);
console.log(`${outputPath} ${evidence.status}`);

async function readEvidenceSha256(
  file: CurrentDf247EvidenceFile,
): Promise<CurrentDf247EvidenceSha256Reference> {
  return {
    ...file,
    sha256: digestSha256(await readFile(file.path)),
  };
}

function digestSha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}
