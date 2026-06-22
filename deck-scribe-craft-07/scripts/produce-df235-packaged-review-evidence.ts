import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  parseDf235PackagedReviewJson,
  produceDf235PackagedReviewEvidence,
} from "./df235-packaged-review-evidence-producer";

const [inputPath, outputPath] = process.argv.slice(2);

if (!inputPath) {
  console.error(
    "Usage: bun scripts/produce-df235-packaged-review-evidence.ts <review-input.json> [output.json]",
  );
  process.exit(1);
}

const input = parseDf235PackagedReviewJson(await readFile(inputPath, "utf8"));
const evidence = produceDf235PackagedReviewEvidence(input);
const payload = `${JSON.stringify(evidence, null, 2)}\n`;

if (outputPath) {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, payload);
  console.log(`${outputPath} ${evidence.status}`);
} else {
  console.log(payload);
}
