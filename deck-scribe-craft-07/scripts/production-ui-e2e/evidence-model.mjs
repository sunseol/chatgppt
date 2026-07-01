import { normalizeArtifactIdentity } from "./artifact-identity.mjs";

export function interactionDirectoryName(index, label) {
  const ordinal = String(index).padStart(3, "0");
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${ordinal}-${slug || "codex"}`;
}

export function redactSensitiveText(text) {
  return text
    .replace(/Bearer\s+[A-Za-z0-9._-]{20,}/g, "Bearer [REDACTED]")
    .replace(/\b[A-Z0-9_]*API_KEY\s*=\s*[^\s]+/gi, (match) => {
      const [key] = match.split("=");
      return `${key}=[REDACTED]`;
    })
    .replace(/sk-[A-Za-z0-9_-]{16,}/g, "sk-[REDACTED]");
}

export function buildProductionE2eSummary({
  ok,
  mode,
  baseUrl,
  outDir,
  artifactIdentity,
  interactions,
  failures,
  recordingPath,
}) {
  const normalizedArtifactIdentity = normalizeArtifactIdentity(artifactIdentity);
  return {
    status: ok ? "pass" : "fail",
    ok,
    mode,
    baseUrl,
    outDir,
    projectStateInjection: false,
    fixtureProjectLoaded: false,
    uiCreatedProject: true,
    localStorageUsage: "fresh browser context only; no project state injection",
    packagedAppTargetSupported: true,
    packagedAppTargetNote:
      "Set DECKFORGE_PRODUCTION_E2E_BASE_URL to an already-running packaged app webview/debug URL; otherwise the runner starts local production preview.",
    artifactIdentity: normalizedArtifactIdentity,
    recordingPath,
    interactions,
    failures,
  };
}

export function buildProductionE2eManifest({ summary, generatedAt, source }) {
  return {
    schemaVersion: 1,
    generatedAt,
    status: summary.status,
    mode: summary.mode,
    baseUrl: summary.baseUrl,
    outDir: summary.outDir,
    source,
    artifactIdentity: summary.artifactIdentity ?? null,
    recordingPath: summary.recordingPath,
    localCandidate: summary.mode === "local-production-preview",
    packagedCandidate: summary.mode === "external-packaged-or-preview-url",
    projectStateInjection: summary.projectStateInjection,
    fixtureProjectLoaded: summary.fixtureProjectLoaded,
    uiCreatedProject: summary.uiCreatedProject,
    requiredInteractionFiles: [
      "interaction.json",
      "before.png",
      "after.png",
      "before-state.json",
      "after-state.json",
      "ipc.jsonl",
      "network.jsonl",
    ],
    interactions: summary.interactions.map((interaction) => ({
      id: interaction.id,
      label: interaction.label,
      ok: interaction.ok,
      target: interaction.target,
      files: interaction.files,
    })),
    failures: summary.failures,
  };
}
