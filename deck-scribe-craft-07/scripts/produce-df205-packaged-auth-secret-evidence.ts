import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  parseDf205PackagedAuthSecretJson,
  produceDf205PackagedAuthSecretEvidence,
} from "./df205-packaged-auth-secret-evidence-producer";

const [inputPath, outputPath] = process.argv.slice(2);

if (!inputPath) {
  console.error(
    "Usage: bun scripts/produce-df205-packaged-auth-secret-evidence.ts <auth-secret-input.json> [output.json]",
  );
  process.exit(1);
}

const input = parseDf205PackagedAuthSecretJson(await readFile(inputPath, "utf8"));
const evidence = produceDf205PackagedAuthSecretEvidence(input);
const payload = `${JSON.stringify(evidence, null, 2)}\n`;

if (outputPath) {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, payload);
  console.log(`${outputPath} ${evidence.status}`);
} else {
  console.log(payload);
}
