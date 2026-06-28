import { readFile } from "node:fs/promises";
import path from "node:path";

export async function attachOptionalVerification({ sourcePath, outPath, writeJson }) {
  if (!sourcePath) return null;
  const verification = JSON.parse(await readFile(path.resolve(sourcePath), "utf8"));
  await writeJson(outPath, verification);
  return verification;
}

export function optionalEvidenceItem({ verification, relativePath, dmgSha256, fallback }) {
  if (!verification) return fallback;
  return {
    status: verification.ok ? "pass" : "blocked",
    path: relativePath,
    dmgSha256,
  };
}
