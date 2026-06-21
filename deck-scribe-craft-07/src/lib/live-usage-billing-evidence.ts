import { hasNonSyntheticJsonEvidencePath } from "./live-evidence-path";

const TEMPLATE_EVIDENCE_MARKERS = ["template", "sample", "example", "placeholder"] as const;
const BILLING_CONFIRMATION_FILENAME = "image-billing-confirmation.json";
const SAFE_EVIDENCE_SEGMENT = /^[a-zA-Z0-9_-]+$/;
const FALLBACK_EVIDENCE_SEGMENTS = ["unknown"] as const;

export function hasBillingConfirmationEvidencePath(path: string | undefined): boolean {
  if (path === undefined || path.trim() !== path) return false;
  if (!hasNonSyntheticJsonEvidencePath(path)) return false;
  const normalizedPath = path.toLowerCase();
  return (
    hasProductBillingConfirmationPath(path) &&
    !TEMPLATE_EVIDENCE_MARKERS.some((marker) => normalizedPath.includes(marker))
  );
}

function hasProductBillingConfirmationPath(path: string): boolean {
  const segments = path.split("/");
  const [usageRoot, projectId, jobId, filename, ...extraSegments] = segments;
  return (
    usageRoot === "usage" &&
    projectId !== undefined &&
    SAFE_EVIDENCE_SEGMENT.test(projectId) &&
    !isFallbackEvidenceSegment(projectId) &&
    jobId !== undefined &&
    SAFE_EVIDENCE_SEGMENT.test(jobId) &&
    !isFallbackEvidenceSegment(jobId) &&
    filename === BILLING_CONFIRMATION_FILENAME &&
    extraSegments.length === 0
  );
}

function isFallbackEvidenceSegment(value: string): boolean {
  const normalizedValue = value.toLowerCase();
  return FALLBACK_EVIDENCE_SEGMENTS.some((segment) => segment === normalizedValue);
}
