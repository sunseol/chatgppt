import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  parseDf233PackagedQueueJson,
  produceDf233PackagedQueueEvidence,
} from "./df233-packaged-queue-evidence-producer";

const [inputPath, outputPath] = process.argv.slice(2);

if (!inputPath) {
  console.error(
    "Usage: bun scripts/produce-df233-packaged-queue-evidence.ts <queue-input.json> [output.json]",
  );
  process.exit(1);
}

const input = parseDf233PackagedQueueJson(await readFile(inputPath, "utf8"));
const evidence = produceDf233PackagedQueueEvidence(input);
const payload = `${JSON.stringify(evidence, null, 2)}\n`;

if (outputPath) {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, payload);
  console.log(`${outputPath} ${evidence.status}`);
} else {
  console.log(payload);
}
