import { createHash } from "node:crypto";
import { readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const SHA256_PATTERN = /^[a-f0-9]{64}$/;

export function parseSha256File(text) {
  const [expectedHash, checksumPath = ""] = text.trim().split(/\s+/, 2);
  if (!SHA256_PATTERN.test(expectedHash ?? "")) {
    throw new Error(`Invalid SHA-256 checksum file hash: ${expectedHash ?? "<missing>"}`);
  }
  return {
    expectedHash,
    checksumPath,
    checksumBasename: checksumPath ? path.basename(checksumPath) : "",
  };
}

export function verifyDmgSha256File(dmgPath) {
  const absoluteDmgPath = path.resolve(dmgPath);
  const shaPath = `${absoluteDmgPath}.sha256`;
  const parsed = parseSha256File(readFileSync(shaPath, "utf8"));
  const expectedBasename = path.basename(absoluteDmgPath);
  if (parsed.checksumBasename && parsed.checksumBasename !== expectedBasename) {
    throw new Error(
      `Checksum file points to ${parsed.checksumBasename}, expected ${expectedBasename}`,
    );
  }

  const actualHash = createHash("sha256").update(readFileSync(absoluteDmgPath)).digest("hex");
  const ok = actualHash === parsed.expectedHash;
  return {
    ok,
    dmgPath: absoluteDmgPath,
    shaPath,
    checksumPathEntry: parsed.checksumPath,
    expectedHash: parsed.expectedHash,
    actualHash,
    sizeBytes: statSync(absoluteDmgPath).size,
  };
}

export function writeDmgSha256Verification(dmgPath, outPath) {
  const verification = {
    ...verifyDmgSha256File(dmgPath),
    checkedAt: new Date().toISOString(),
  };
  writeFileSync(outPath, `${JSON.stringify(verification, null, 2)}\n`);
  if (!verification.ok) {
    throw new Error(
      `DMG SHA-256 mismatch: expected ${verification.expectedHash}, got ${verification.actualHash}`,
    );
  }
  return verification;
}
