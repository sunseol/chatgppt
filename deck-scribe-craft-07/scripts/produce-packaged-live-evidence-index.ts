import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  PACKAGED_LIVE_EVIDENCE_ARTIFACT_PATHS,
  PACKAGED_LIVE_EVIDENCE_INDEX_PATH,
  producePackagedLiveEvidenceIndex,
} from "./packaged-live-evidence-index-producer";
import { PACKAGED_LIVE_EVIDENCE_TICKET_IDS } from "../src/lib/packaged-live-evidence-index";

const [outputPath, generatedAtArg] = process.argv.slice(2);

if (outputPath === "--help" || outputPath === "-h") {
  console.log(
    "Usage: bun scripts/produce-packaged-live-evidence-index.ts [output.json] [generatedAt]",
  );
  process.exit(0);
}

const generatedAt = generatedAtArg ?? new Date().toISOString();
const sources = await Promise.all(
  PACKAGED_LIVE_EVIDENCE_TICKET_IDS.map(async (ticketId) => {
    const artifactPath = PACKAGED_LIVE_EVIDENCE_ARTIFACT_PATHS[ticketId];
    const artifactBuffer = await readFile(artifactPath);
    return {
      artifactPath,
      artifactJson: artifactBuffer.toString("utf8"),
      artifactSha256: sha256(artifactBuffer),
    };
  }),
);
const index = producePackagedLiveEvidenceIndex({
  generatedAt,
  indexPath: PACKAGED_LIVE_EVIDENCE_INDEX_PATH,
  sources,
});
const payload = `${JSON.stringify(index, null, 2)}\n`;

if (outputPath) {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, payload);
  console.log(`${outputPath} ${index.entries.length} entries`);
} else {
  console.log(payload);
}

function sha256(content: Uint8Array): string {
  return createHash("sha256").update(content).digest("hex");
}
