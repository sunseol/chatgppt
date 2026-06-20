import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const DOCS = {
  researchNetworkPolicy: new URL("../../docs/live-research-network-policy.md", import.meta.url),
  sourceCapture: new URL("../../docs/live-source-capture-bundle.md", import.meta.url),
  webSearchEvidence: new URL("../../docs/live-web-search-evidence.md", import.meta.url),
  researchEvidence: new URL("../../docs/live-research-evidence-pipeline.md", import.meta.url),
  researchApproval: new URL("../../docs/live-research-approval-gate.md", import.meta.url),
} as const;

describe("live readiness research documentation", () => {
  test("records the live research network and prompt-injection policy", () => {
    const researchNetworkPolicy = readDoc(DOCS.researchNetworkPolicy);

    expect(researchNetworkPolicy.includes("DF-220")).toBe(true);
    expect(researchNetworkPolicy.includes("untrusted_source_content")).toBe(true);
    expect(researchNetworkPolicy.includes("shell_command_request")).toBe(true);
    expect(researchNetworkPolicy.includes("credential_request")).toBe(true);
    expect(researchNetworkPolicy.includes("external_post_request")).toBe(true);
    expect(researchNetworkPolicy.includes("GET/HEAD")).toBe(true);
    expect(researchNetworkPolicy.includes("mock_source")).toBe(true);
  });

  test("records a live HTML and PDF source capture bundle", () => {
    const sourceCapture = readDoc(DOCS.sourceCapture);

    expect(sourceCapture.includes("DF-222")).toBe(true);
    expect(sourceCapture.includes("HTML succeeded: 2")).toBe(true);
    expect(sourceCapture.includes("PDF succeeded: 1")).toBe(true);
    expect(sourceCapture.includes("html_failed_001")).toBe(true);
    expect(sourceCapture.includes("sha256:")).toBe(true);
    expect(sourceCapture.includes("validateResearchSourceCaptureBundle")).toBe(true);
    expect(sourceCapture.includes("insufficient_html_captures")).toBe(true);
    expect(sourceCapture.includes("missing_pdf_capture")).toBe(true);
    expect(sourceCapture.includes("ResearchPack.sources[].capture")).toBe(true);
    expect(sourceCapture.includes("ResearchPack.sources[].captureHistory")).toBe(true);
    expect(sourceCapture.includes("SourceReviewList")).toBe(true);
    expect(sourceCapture.includes("html_001_v2")).toBe(true);
    expect(sourceCapture.includes("Previous version")).toBe(true);
    expect(sourceCapture.includes("Raw changed")).toBe(true);
    expect(sourceCapture.includes("Text changed")).toBe(true);
  });

  test("records the live web search evidence contract", () => {
    const webSearchEvidence = readDoc(DOCS.webSearchEvidence);

    expect(webSearchEvidence.includes("DF-221")).toBe(true);
    expect(webSearchEvidence.includes("webSearchMode")).toBe(true);
    expect(webSearchEvidence.includes("non_live_search_candidate")).toBe(true);
    expect(webSearchEvidence.includes("candidate_query_not_recorded")).toBe(true);
    expect(webSearchEvidence.includes("insufficient_live_domains")).toBe(true);
    expect(webSearchEvidence.includes("cached_latestness_benchmark")).toBe(true);
    expect(webSearchEvidence.includes("ResearchPack.webSearchEvidence")).toBe(true);
    expect(webSearchEvidence.includes("Status: verified live worker evidence")).toBe(true);
    expect(webSearchEvidence.includes("019edc32-6efe-7280-a2c1-47fb1d6b0ebf")).toBe(true);
    expect(webSearchEvidence.includes("six live candidates across six domains")).toBe(true);
  });

  test("records the live evidence, claim, and dataset pipeline contract", () => {
    const researchEvidence = readDoc(DOCS.researchEvidence);

    expect(researchEvidence.includes("DF-223")).toBe(true);
    expect(researchEvidence.includes("claim-to-source roundtrip")).toBe(true);
    expect(researchEvidence.includes("summary_without_original")).toBe(true);
    expect(researchEvidence.includes("missing_source_artifact")).toBe(true);
    expect(researchEvidence.includes("source_artifact_mismatch")).toBe(true);
    expect(researchEvidence.includes("whitespace-padded path matches")).toBe(true);
    expect(researchEvidence.includes("missing_dataset_or_numeric_evidence")).toBe(true);
    expect(researchEvidence.includes("missing_number_dataset")).toBe(true);
    expect(researchEvidence.includes("unknown_reference")).toBe(true);
    expect(researchEvidence.includes("unknown claims")).toBe(true);
    expect(researchEvidence.includes("evidence refs name datasets outside")).toBe(true);
    expect(researchEvidence.includes("Numeric evidence must roundtrip")).toBe(true);
    expect(researchEvidence.includes("claim source artifact ids")).toBe(true);
    expect(researchEvidence.includes("dataset metadata")).toBe(true);
    expect(researchEvidence.includes("ResearchPack.liveEvidenceRefs")).toBe(true);
    expect(researchEvidence.includes("capture.rawArchivePath")).toBe(true);
  });

  test("records the live research review and approval gate contract", () => {
    const researchApproval = readDoc(DOCS.researchApproval);

    expect(researchApproval.includes("DF-224")).toBe(true);
    expect(researchApproval.includes("missing_provenance")).toBe(true);
    expect(researchApproval.includes("research_pack_provenance_mismatch")).toBe(true);
    expect(researchApproval.includes("current Research Pack artifact id")).toBe(true);
    expect(researchApproval.includes("exact canonical current Research Pack artifact id")).toBe(
      true,
    );
    expect(researchApproval.includes("source_missing_live_capture")).toBe(true);
    expect(researchApproval.includes("source_capture_incomplete")).toBe(true);
    expect(researchApproval.includes("approvedResearchPackHash")).toBe(true);
    expect(researchApproval.includes("current Research Pack content")).toBe(true);
    expect(researchApproval.includes("stale approved hashes")).toBe(true);
    expect(researchApproval.includes("returns no handoff")).toBe(true);
    expect(researchApproval.includes("desktop-live-text-pipeline-jobs")).toBe(true);
    expect(researchApproval.includes("ProductionResearchReview")).toBe(true);
    expect(researchApproval.includes("Live research approval gate")).toBe(true);
    expect(researchApproval.includes("Live Research Pack 승인")).toBe(true);
    expect(researchApproval.includes("출처 제외")).toBe(true);
    expect(researchApproval.includes("ResearchReviewState")).toBe(true);
    expect(researchApproval.includes("research-review-actions")).toBe(true);
    expect(researchApproval.includes("pending_reinforcement_request")).toBe(true);
    expect(researchApproval.includes("ResearchPack.provenanceLineage")).toBe(true);
    expect(researchApproval.includes("stale provider provenance")).toBe(true);
    expect(researchApproval.includes("ResearchPack.sources[].capture")).toBe(true);
    expect(researchApproval.includes("empty gate inputs")).toBe(true);
    expect(researchApproval.includes("approved research artifact record")).toBe(true);
    expect(
      researchApproval.includes("projects/{projectId}/research/research.v{version}.json"),
    ).toBe(true);
  });
});

function readDoc(url: URL): string {
  return readFileSync(url, "utf8");
}
