import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { evaluateLiveBenchmarkEvidence } from "../src/lib/live-benchmark-evidence";
import { evaluateLiveGoldenPathE2EBundle } from "../src/lib/live-golden-path-e2e";
import { buildDf241Df242CandidateEvidence } from "./df241-df242-candidate-evidence-support";

const PACKAGE_SHA = "bdb64f343b721a435889377d6449d18d537fe27a11ac41be343c481c483688ee";
const OUTPUT_PATH = "docs/live-evidence/release/df241-df242-candidate-20260622.json";
const CAPTURED_AT = "2026-06-22T00:43:56Z";

const evidence = buildDf241Df242CandidateEvidence({
  packageArchiveSha256: PACKAGE_SHA,
});
const goldenPathResult = evaluateLiveGoldenPathE2EBundle(evidence.goldenPathBundle);
const benchmarkResult = evaluateLiveBenchmarkEvidence(evidence.benchmarkBundle);
const payload = {
  capturedAt: CAPTURED_AT,
  evidenceKind: "df241-df242-current-candidate-evidence",
  status: "blocked",
  packageArchiveSha256: PACKAGE_SHA,
  summary:
    "Existing live text, source, image, regeneration, and export artifacts can be assembled into a reviewable candidate, but they are not one signed packaged Golden Path or five packaged benchmark runs.",
  goldenPath: {
    result: goldenPathResult,
    completedSteps: evidence.goldenPathBundle.completedSteps,
    sourceCount: evidence.goldenPathBundle.sources.length,
    imageArtifactCount: evidence.goldenPathBundle.imageArtifacts.length,
    textLineageCount:
      evidence.goldenPathBundle.lineage.length - evidence.goldenPathBundle.imageArtifacts.length,
    missingReleaseEvidence: [
      "packaged login step",
      "single-run signed live_e2e_report.md",
      "per-step screenshots",
      "recording",
      "final validation bundle",
      "title edit evidence",
      "restart/reopen evidence",
    ],
  },
  benchmark: {
    result: benchmarkResult,
    scenarioCount: evidence.benchmarkBundle.runs.length,
    passedLiveCount: benchmarkResult.passedLiveCount,
    missingReleaseEvidence: [
      "five distinct packaged benchmark output bundles",
      "at least four completed packaged Golden Path benchmark passes",
      "scenario reports",
      "per-scenario screenshots, sources, images, regeneration, and export ids",
    ],
  },
  sourceArtifacts: evidence.goldenPathBundle.sources,
  imageArtifactIds: evidence.goldenPathBundle.imageArtifacts.map((artifact) => artifact.artifactId),
};

await mkdir(dirname(OUTPUT_PATH), { recursive: true });
await writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`${OUTPUT_PATH} ${await sha256File(OUTPUT_PATH)}`);

async function sha256File(path: string): Promise<string> {
  return createHash("sha256")
    .update(await readFile(path))
    .digest("hex");
}
