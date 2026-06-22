import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  parseDf243InterruptionClosureJson,
  produceDf243InterruptionClosureEvidence,
} from "./df243-interruption-closure-evidence-producer";

const [inputPath, outputPath] = process.argv.slice(2);

if (!inputPath) {
  console.error(
    "Usage: bun scripts/produce-df243-interruption-closure-evidence.ts <interruption-input.json> [output.json]",
  );
  process.exit(1);
}

const input = parseDf243InterruptionClosureJson(await readFile(inputPath, "utf8"));
const evidence = produceDf243InterruptionClosureEvidence(input);
const payload = `${JSON.stringify(evidence, null, 2)}\n`;

if (outputPath) {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, payload);
  console.log(`${outputPath} ${evidence.status}`);
} else {
  console.log(payload);
}
