import { hasNonSyntheticJsonEvidencePath } from "./live-evidence-path";

const TEMPLATE_EVIDENCE_MARKERS = ["template", "sample", "example", "placeholder"] as const;
const BILLING_CONFIRMATION_FILENAME = "image-billing-confirmation.json";
const SAFE_EVIDENCE_SEGMENT = /^[a-zA-Z0-9_-]+$/;
const FALLBACK_EVIDENCE_SEGMENTS = ["unknown"] as const;

export type ImageBillingDisclosureEvidence = {
  readonly apiKeyRequired: boolean;
  readonly userConfirmed: boolean;
  readonly label: string;
  readonly confirmationEvidencePath?: string;
};

export type ImageBillingDisclosureEvidenceOptions = {
  readonly expectedJobId?: string;
};

export function hasConfirmedCodexImageBillingDisclosure(
  disclosure: ImageBillingDisclosureEvidence | undefined,
  options: ImageBillingDisclosureEvidenceOptions = {},
): boolean {
  const path = disclosure?.confirmationEvidencePath;
  return (
    disclosure !== undefined &&
    disclosure.apiKeyRequired === false &&
    disclosure.userConfirmed === true &&
    disclosure.label.trim().length > 0 &&
    hasBillingConfirmationEvidencePath(path) &&
    billingConfirmationEvidenceMatchesJob(path, options.expectedJobId)
  );
}

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

function billingConfirmationEvidenceMatchesJob(
  path: string | undefined,
  expectedJobId: string | undefined,
): boolean {
  if (expectedJobId === undefined) return true;
  if (!SAFE_EVIDENCE_SEGMENT.test(expectedJobId) || isFallbackEvidenceSegment(expectedJobId)) {
    return false;
  }
  return path?.split("/")[2] === expectedJobId;
}

function isFallbackEvidenceSegment(value: string): boolean {
  const normalizedValue = value.toLowerCase();
  return FALLBACK_EVIDENCE_SEGMENTS.some((segment) => segment === normalizedValue);
}
