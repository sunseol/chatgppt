import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  parseDf241Df242PackagedRunJson,
  produceDf241Df242PackagedEvidence,
} from "./df241-df242-packaged-evidence-producer";

const [inputPath, outputPath] = process.argv.slice(2);

if (!inputPath) {
  console.error(
    "Usage: bun scripts/produce-df241-df242-packaged-evidence.ts <packaged-run.json> [output.json]",
  );
  process.exit(1);
}

const input = parseDf241Df242PackagedRunJson(await readFile(inputPath, "utf8"));
const evidence = produceDf241Df242PackagedEvidence(input);
const payload = `${JSON.stringify(evidence, null, 2)}\n`;

if (outputPath) {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, payload);
  console.log(`${outputPath} ${evidence.status}`);
} else {
  console.log(payload);
}
