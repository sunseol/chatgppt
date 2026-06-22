import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  parseDf247ReleaseGateEvidenceJson,
  produceDf247ReleaseGateEvidence,
} from "./df247-release-gate-evidence-producer";

const [inputPath, outputPath] = process.argv.slice(2);

if (!inputPath) {
  console.error(
    "Usage: bun scripts/produce-df247-release-gate-evidence.ts <release-gate-input.json> [output.json]",
  );
  process.exit(1);
}

const input = parseDf247ReleaseGateEvidenceJson(await readFile(inputPath, "utf8"));
const evidence = produceDf247ReleaseGateEvidence(input);
const payload = `${JSON.stringify(evidence, null, 2)}\n`;

if (outputPath) {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, payload);
  console.log(`${outputPath} ${evidence.status}`);
} else {
  console.log(payload);
}
