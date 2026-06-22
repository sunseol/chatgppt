import { describe, expect, test } from "bun:test";
import {
  parseDf244PackagedUsageInput,
  produceDf244PackagedUsageEvidence,
} from "./df244-packaged-usage-evidence-producer";

const PACKAGE_SHA = "bdb64f343b721a435889377d6449d18d537fe27a11ac41be343c481c483688ee";
const CAPTURED_AT = "2026-06-22T04:15:00.000Z";
const PROJECT_ID = "df244_packaged_usage_20260622";
const JOB_ID = "job_packaged_generate_1";
const CONFIRMATION_EVIDENCE_PATH = `usage/${PROJECT_ID}/${JOB_ID}/image-billing-confirmation.json`;
const CONFIRMATION_RECORD_PATH = `docs/live-evidence/packaged-df244-20260622/${CONFIRMATION_EVIDENCE_PATH}`;

describe("DF-244 packaged usage evidence producer", () => {
  test("produces ready usage evidence from same-run Codex OAuth confirmation and display proof", () => {
    // Given
    const input = parseDf244PackagedUsageInput(completeInput());

    // When
    const evidence = produceDf244PackagedUsageEvidence(input);

    // Then
    expect(evidence.evidenceKind).toBe("df244-packaged-usage-evidence");
    expect(evidence.status).toBe("ready");
    expect(evidence.usageValidation).toEqual({ kind: "ready" });
    expect(evidence.releaseBlockers).toEqual([]);
    expect(evidence.displayEvidence.confirmationVisible).toBe(true);
  });

  test("keeps packaged usage evidence blocked when display proof is incomplete", () => {
    // Given
    const input = parseDf244PackagedUsageInput({
      ...completeInput(),
      displayEvidence: {
        ...completeInput().displayEvidence,
        confirmationVisible: false,
      },
    });

    // When
    const evidence = produceDf244PackagedUsageEvidence(input);

    // Then
    expect(evidence.status).toBe("blocked");
    expect(evidence.releaseBlockers).toContain("DF-244 usage display evidence is incomplete");
  });

  test("keeps packaged usage evidence blocked when confirmation belongs to another job", () => {
    // Given
    const input = parseDf244PackagedUsageInput({
      ...completeInput(),
      confirmationRecord: {
        ...completeInput().confirmationRecord,
        jobId: "job_other",
      },
    });

    // When
    const evidence = produceDf244PackagedUsageEvidence(input);

    // Then
    expect(evidence.status).toBe("blocked");
    expect(evidence.releaseBlockers).toContain(
      "DF-244 confirmation record does not match the packaged run",
    );
  });

  test("rejects malformed packaged usage input at the boundary", () => {
    // Given
    const malformedInput = {
      capturedAt: CAPTURED_AT,
      packageArchiveSha256: PACKAGE_SHA,
    };

    // When / Then
    expect(() => parseDf244PackagedUsageInput(malformedInput)).toThrow(
      "Invalid DF-244 packaged usage input",
    );
  });
});

function completeInput() {
  return {
    capturedAt: CAPTURED_AT,
    packageArchiveSha256: PACKAGE_SHA,
    productRunSummary: {
      evidenceKind: "packaged-live-codex-generate-export-smoke",
      projectId: PROJECT_ID,
      jobId: JOB_ID,
      completedJobStatus: "succeeded",
      jobs: [
        { id: JOB_ID, status: "queued", attempt: 1 },
        { id: JOB_ID, status: "running", attempt: 1 },
      ],
      slides: [
        {
          slideNumber: 1,
          status: "ready",
          artifactPath: `docs/live-evidence/packaged-df244-20260622/${PROJECT_ID}/slide_001.v1.png`,
        },
      ],
      projectFolderExport: {
        projectArtifactWriteCount: 5,
        includesOtherProjects: false,
        leaksSyntheticSecret: false,
      },
      appServerTurns: [
        {
          threadId: "019eed41-a44d-7e22-9bbf-c1cae2f3db92",
          turnId: "019eed41-a6b8-7e23-838b-ccaa677a084f",
          durationMs: 185_181,
          errors: [],
        },
      ],
    },
    usageSummary: {
      evidenceKind: "df244-product-usage-confirmation-summary",
      projectId: PROJECT_ID,
      providerKind: "codex",
      imageCount: 1,
      totalLatencyMs: 185_181,
      costDisplay: "hidden_provider_did_not_supply_cost",
      userConfirmation: "confirmed_app_surface_pre_generation_codex_oauth",
      confirmationEvidencePath: CONFIRMATION_EVIDENCE_PATH,
      confirmationRecordPath: CONFIRMATION_RECORD_PATH,
      confirmationLabel: "Codex image usage confirmed",
      billingOwner: "codex_oauth_account",
      confirmedAt: 1782096961053,
    },
    confirmationRecord: {
      type: "deckforge_live_image_billing_confirmation",
      version: 1,
      projectId: PROJECT_ID,
      jobId: JOB_ID,
      providerId: "codex",
      evidencePath: CONFIRMATION_EVIDENCE_PATH,
      label: "Codex image usage confirmed",
      apiKeyRequired: false,
      billingOwner: "codex_oauth_account",
      confirmedAt: 1782096961053,
    },
    displayEvidence: {
      evidencePath: "docs/live-evidence/packaged-df244-20260622/usage-display.png",
      latencyVisible: true,
      retryCountVisible: true,
      imageCountVisible: true,
      confirmationVisible: true,
    },
  };
}
