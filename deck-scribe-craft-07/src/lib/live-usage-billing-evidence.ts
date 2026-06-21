import { hasNonSyntheticJsonEvidencePath } from "./live-evidence-path";

const TEMPLATE_EVIDENCE_MARKERS = ["template", "sample", "example", "placeholder"] as const;
const BILLING_CONFIRMATION_FILENAME = "image-billing-confirmation.json";

export function hasBillingConfirmationEvidencePath(path: string | undefined): boolean {
  if (path === undefined) return false;
  if (!hasNonSyntheticJsonEvidencePath(path)) return false;
  const normalizedPath = path.toLowerCase();
  return (
    normalizedPath.endsWith(BILLING_CONFIRMATION_FILENAME) &&
    !TEMPLATE_EVIDENCE_MARKERS.some((marker) => normalizedPath.includes(marker))
  );
}
