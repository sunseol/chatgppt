const SHA256_PATTERN = /^[a-f0-9]{64}$/;

export function readProductionE2eArtifactIdentity(env = process.env) {
  return normalizeArtifactIdentity({
    dmgPath: env.DECKFORGE_PRODUCTION_E2E_DMG_PATH,
    dmgSha256: env.DECKFORGE_PRODUCTION_E2E_DMG_SHA256,
    releaseManifestPath: env.DECKFORGE_PRODUCTION_E2E_RELEASE_MANIFEST,
  });
}

export function normalizeArtifactIdentity(identity) {
  const dmgPath = trim(identity?.dmgPath);
  const dmgSha256 = trim(identity?.dmgSha256)?.toLowerCase();
  const releaseManifestPath = trim(identity?.releaseManifestPath);
  if (!dmgPath && !dmgSha256 && !releaseManifestPath) return null;
  return {
    dmgPath,
    dmgSha256,
    releaseManifestPath,
  };
}

export function isSha256(value) {
  return typeof value === "string" && SHA256_PATTERN.test(value);
}

function trim(value) {
  return typeof value === "string" ? value.trim() : "";
}
