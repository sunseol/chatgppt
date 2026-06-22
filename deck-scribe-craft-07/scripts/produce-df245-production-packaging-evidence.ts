import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  parseDf245ProductionPackagingJson,
  produceDf245ProductionPackagingEvidence,
} from "./df245-production-packaging-evidence-producer";

const [inputPath, outputPath] = process.argv.slice(2);

if (!inputPath) {
  console.error(
    "Usage: bun scripts/produce-df245-production-packaging-evidence.ts <packaging-input.json> [output.json]",
  );
  process.exit(1);
}

const input = parseDf245ProductionPackagingJson(await readFile(inputPath, "utf8"));
const evidence = produceDf245ProductionPackagingEvidence(input);
const payload = `${JSON.stringify(evidence, null, 2)}\n`;

if (outputPath) {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, payload);
  console.log(`${outputPath} ${evidence.status}`);
} else {
  console.log(payload);
}
