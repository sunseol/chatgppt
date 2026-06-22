import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  parseDf244PackagedUsageJson,
  produceDf244PackagedUsageEvidence,
} from "./df244-packaged-usage-evidence-producer";

const [inputPath, outputPath] = process.argv.slice(2);

if (!inputPath) {
  console.error(
    "Usage: bun scripts/produce-df244-packaged-usage-evidence.ts <usage-input.json> [output.json]",
  );
  process.exit(1);
}

const input = parseDf244PackagedUsageJson(await readFile(inputPath, "utf8"));
const evidence = produceDf244PackagedUsageEvidence(input);
const payload = `${JSON.stringify(evidence, null, 2)}\n`;

if (outputPath) {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, payload);
  console.log(`${outputPath} ${evidence.status}`);
} else {
  console.log(payload);
}
