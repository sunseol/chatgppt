import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  buildDf205PackagedAuthSecretInputFromCurrentEvidence,
  DF205_AUTH_BOOTSTRAP_SMOKE_PATH,
  DF245_PACKAGE_RECHECK_PATH,
  parseDf205AuthBootstrapSmokeJson,
  parseDf245CurrentPackageRecheckJson,
} from "./df205-current-release-auth-secret-ingestion";
import { produceDf205PackagedAuthSecretEvidence } from "./df205-packaged-auth-secret-evidence-producer";

const DEFAULT_OUTPUT_PATH =
  "docs/live-evidence/release/df205-packaged-auth-secret-candidate-20260622.json";

const [
  authBootstrapSmokePath = DF205_AUTH_BOOTSTRAP_SMOKE_PATH,
  packageRecheckPath = DF245_PACKAGE_RECHECK_PATH,
  outputPath = DEFAULT_OUTPUT_PATH,
] = process.argv.slice(2);

const authBootstrapSmoke = parseDf205AuthBootstrapSmokeJson(
  await readFile(authBootstrapSmokePath, "utf8"),
);
const packageRecheck = parseDf245CurrentPackageRecheckJson(
  await readFile(packageRecheckPath, "utf8"),
);
const input = buildDf205PackagedAuthSecretInputFromCurrentEvidence({
  authBootstrapSmoke,
  packageRecheck,
  authBootstrapSmokePath,
  packageRecheckPath,
});
const evidence = produceDf205PackagedAuthSecretEvidence(input);

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`${outputPath} ${evidence.status}`);
