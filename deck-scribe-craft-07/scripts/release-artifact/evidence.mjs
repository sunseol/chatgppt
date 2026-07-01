import path from "node:path";
import { verifyDmgSha256File } from "./checksum.mjs";

export function verifyReleaseArtifactEvidence(manifest, options = {}) {
  const identity = manifest.artifactIdentity ?? {};
  const sourceDmgSha256 = identity.dmgSha256 ?? "";
  const checkedAt = new Date().toISOString();
  if (!identity.dmgPath) {
    return blockedReleaseArtifact({
      checkedAt,
      sourceDmgSha256,
      findings: [{ code: "missing_dmg_path", path: "artifactIdentity.dmgPath" }],
    });
  }

  try {
    const dmgPath = resolveDmgPath(identity.dmgPath, options.rootDir ?? process.cwd());
    const checksum = verifyDmgSha256File(dmgPath);
    const findings =
      checksum.actualHash === sourceDmgSha256
        ? []
        : [
            {
              code: "release_artifact_hash_mismatch",
              path: "artifactIdentity.dmgSha256",
              detail: `${sourceDmgSha256} != ${checksum.actualHash}`,
            },
          ];
    return {
      ok: checksum.ok && findings.length === 0,
      status: checksum.ok && findings.length === 0 ? "pass" : "blocked",
      checkedAt,
      sourceDmgSha256,
      dmgPath: checksum.dmgPath,
      shaPath: checksum.shaPath,
      checksumPathEntry: checksum.checksumPathEntry,
      expectedHash: checksum.expectedHash,
      actualHash: checksum.actualHash,
      sizeBytes: checksum.sizeBytes,
      findings,
    };
  } catch (error) {
    return blockedReleaseArtifact({
      checkedAt,
      sourceDmgSha256,
      findings: [
        {
          code: "release_artifact_checksum_unreadable",
          path: "artifactIdentity.dmgPath",
          detail: error instanceof Error ? error.message : String(error),
        },
      ],
    });
  }
}

function resolveDmgPath(dmgPath, rootDir) {
  return path.isAbsolute(dmgPath) ? dmgPath : path.resolve(rootDir, dmgPath);
}

function blockedReleaseArtifact({ checkedAt, sourceDmgSha256, findings }) {
  return {
    ok: false,
    status: "blocked",
    checkedAt,
    sourceDmgSha256,
    findings,
  };
}
