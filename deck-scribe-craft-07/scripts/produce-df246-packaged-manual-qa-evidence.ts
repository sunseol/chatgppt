import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  parseDf246PackagedManualQaJson,
  produceDf246PackagedManualQaEvidence,
} from "./df246-packaged-manual-qa-evidence-producer";

const [inputPath, outputPath] = process.argv.slice(2);

if (!inputPath) {
  console.error(
    "Usage: bun scripts/produce-df246-packaged-manual-qa-evidence.ts <manual-qa-input.json> [output.json]",
  );
  process.exit(1);
}

const input = parseDf246PackagedManualQaJson(await readFile(inputPath, "utf8"));
const evidence = produceDf246PackagedManualQaEvidence(input);
const payload = `${JSON.stringify(evidence, null, 2)}\n`;

if (outputPath) {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, payload);
  console.log(`${outputPath} ${evidence.status}`);
} else {
  console.log(payload);
}
