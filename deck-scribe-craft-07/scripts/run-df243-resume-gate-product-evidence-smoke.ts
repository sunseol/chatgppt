import { mkdir } from "node:fs/promises";
import { writeLiveInterruptionGateEvidenceExport } from "../src/lib/live-interruption-gate-evidence-export";
import { writeLiveInterruptionImageResumeEvidenceExport } from "../src/lib/live-interruption-image-resume-evidence-export";
import {
  evaluateLiveInterruptionMatrix,
  type LiveInterruptionScenarioEvidence,
  type LiveInterruptionScenarioId,
} from "../src/lib/live-interruption-matrix";
import { buildLocalProjectFolderExport } from "../src/lib/local-data-control";
import {
  FileBackedArtifactStore,
  approvedProject,
  clock,
  contentBytes,
  sha256File,
  writeJson,
} from "./live-codex-generate-export-smoke-support";

const EVIDENCE_DIR = "docs/live-evidence/codex-image/df243-resume-gate-product-smoke-20260622";
const PROJECT_ID = "df243_resume_gate_smoke_20260622";
const RUN_ID = "resume_gate_product_run_20260622";
const CAPTURED_AT = "2026-06-22T00:10:00.000Z";

const startedAt = Date.parse(CAPTURED_AT);
await mkdir(EVIDENCE_DIR, { recursive: true });

const store = new FileBackedArtifactStore();
const completedBefore = [`${PROJECT_ID}_image_slide_001_v1`, `${PROJECT_ID}_image_slide_002_v1`];
const resumedImageArtifacts = [`${PROJECT_ID}_image_slide_003_v1`];
const completedAfter = [...completedBefore, ...resumedImageArtifacts];
const interruptedArtifacts = [`${PROJECT_ID}_partial_export_bundle_001`];

const imageResume = await writeLiveInterruptionImageResumeEvidenceExport({
  store,
  projectId: PROJECT_ID,
  jobId: RUN_ID,
  liveJobId: "live_job_image_partial_resume_product_1",
  exportedAt: clock(startedAt + 1_000)(),
  completedArtifactIdsBefore: completedBefore,
  completedArtifactIdsAfter: completedAfter,
  pendingImageArtifactIds: resumedImageArtifacts,
  resumedArtifactIds: resumedImageArtifacts,
});
if (imageResume.kind === "blocked") {
  throw new Error(`DF-243 image resume evidence blocked: ${imageResume.issues.join(" ")}`);
}

const gate = await writeLiveInterruptionGateEvidenceExport({
  store,
  projectId: PROJECT_ID,
  jobId: RUN_ID,
  liveJobId: "live_job_interrupted_artifact_gate_product_1",
  exportedAt: clock(startedAt + 2_000)(),
  completedArtifactIdsBefore: completedBefore,
  completedArtifactIdsAfter: completedAfter,
  interruptedArtifactIds: interruptedArtifacts,
  approvalDeniedArtifactIds: interruptedArtifacts,
  exportDeniedArtifactIds: interruptedArtifacts,
  approvableArtifactIds: completedAfter,
  exportableArtifactIds: completedAfter,
});
if (gate.kind === "blocked") {
  throw new Error(`DF-243 gate evidence blocked: ${gate.issues.join(" ")}`);
}

const matrix = {
  reportPath: "docs/live-interruption-matrix.md",
  scenarios: completeScenariosWith(imageResume.scenario, gate.scenario),
};
const matrixResult = evaluateLiveInterruptionMatrix(matrix);
if (matrixResult.kind === "blocked") {
  throw new Error(
    `DF-243 resume/gate smoke matrix blocked: ${matrixResult.issues
      .map((issue) => issue.code)
      .join(" ")}`,
  );
}

const projectFolderExport = buildLocalProjectFolderExport(
  {
    ...approvedProject(PROJECT_ID, startedAt, { slideCount: 3 }),
    updatedAt: startedAt + 3_000,
  },
  { artifactWrites: store.browserWrites() },
);
const matrixPath = `${EVIDENCE_DIR}/df243-resume-gate-product-smoke-matrix.json`;
await writeJson(matrixPath, matrix);
const summaryPath = `${EVIDENCE_DIR}/summary.json`;
await writeJson(summaryPath, {
  capturedAt: CAPTURED_AT,
  evidenceKind: "df243-resume-gate-product-evidence-smoke",
  runtime: "product DF-243 image partial-resume and interrupted gate evidence writers",
  projectId: PROJECT_ID,
  runId: RUN_ID,
  imageResume: {
    recoverySnapshotPath: imageResume.recoverySnapshotPath,
    pendingImageArtifactIds: imageResume.snapshot.pendingImageArtifactIds,
    resumedArtifactIds: imageResume.snapshot.resumedArtifactIds,
  },
  interruptedGate: {
    recoverySnapshotPath: gate.recoverySnapshotPath,
    approvalGateEvidencePath: gate.approvalGateEvidencePath,
    exportGateEvidencePath: gate.exportGateEvidencePath,
    interruptedArtifactIds: gate.recoverySnapshot.interruptedArtifactIds,
    approvableArtifactIds: gate.scenario.approvableArtifactIds,
    exportableArtifactIds: gate.scenario.exportableArtifactIds,
  },
  matrixPath,
  matrixResult,
  artifactWrites: store.writes.map((write) => ({
    path: write.path,
    kind: typeof write.content === "string" ? "text" : "binary",
    bytes: contentBytes(write.content),
  })),
  projectFolderExport: {
    bytes: Buffer.byteLength(projectFolderExport.content),
    projectArtifactWriteCount: store.browserWrites().length,
    includesImageResumeSnapshot: projectFolderExport.content.includes(
      imageResume.recoverySnapshotPath,
    ),
    includesApprovalGate: projectFolderExport.content.includes(gate.approvalGateEvidencePath),
    includesExportGate: projectFolderExport.content.includes(gate.exportGateEvidencePath),
  },
});

console.log(`${summaryPath} ${await sha256File(summaryPath)}`);

function completeScenariosWith(
  imageScenario: LiveInterruptionScenarioEvidence,
  gateScenario: LiveInterruptionScenarioEvidence,
): readonly LiveInterruptionScenarioEvidence[] {
  return [
    scenario("text_turn_shutdown", "failed"),
    scenario("fetch_shutdown", "failed"),
    imageScenario,
    scenario("cancel_job", "cancelled", {
      recoverySnapshotPath: `projects/${PROJECT_ID}/live-evidence/df243-cancel-job-recovery-snapshot-${RUN_ID}.json`,
      cancelSignalEvidencePath: `projects/${PROJECT_ID}/live-evidence/df243-cancel-job-cancel-signal-${RUN_ID}.json`,
      cancelSignalJobId: "live_job_cancel_job_resume_gate_product_1",
    }),
    gateScenario,
  ];
}

function scenario(
  id: Exclude<LiveInterruptionScenarioId, "image_partial_resume" | "interrupted_artifact_gate">,
  status: LiveInterruptionScenarioEvidence["jobStatusAfterRestart"],
  patch: Partial<LiveInterruptionScenarioEvidence> = {},
): LiveInterruptionScenarioEvidence {
  return {
    id,
    jobStatusAfterRestart: status,
    completedArtifactIdsBefore: completedBefore,
    completedArtifactIdsAfter: completedBefore,
    liveJobId: `live_job_${id}_resume_gate_product_1`,
    recoverySnapshotPath: `projects/${PROJECT_ID}/live-evidence/df243-${id.replaceAll(
      "_",
      "-",
    )}-recovery-snapshot-${RUN_ID}.json`,
    recoverySnapshotScope: "app_storage",
    cancellationRecorded: true,
    pendingImageArtifactIds: [],
    resumedArtifactIds: [],
    cancelledJobStillRunning: false,
    interruptedArtifactIds: [],
    approvableArtifactIds: completedAfter,
    exportableArtifactIds: completedAfter,
    approvalGateChecked: true,
    approvalGateEvidencePath: `projects/${PROJECT_ID}/live-evidence/df243-${id}-approval-${RUN_ID}.json`,
    exportGateChecked: true,
    exportGateEvidencePath: `projects/${PROJECT_ID}/live-evidence/df243-${id}-export-${RUN_ID}.json`,
    ...patch,
  };
}
