import { hasNonSyntheticJsonEvidencePath } from "./live-evidence-path";

const TEMPLATE_EVIDENCE_MARKERS = ["template", "sample", "example", "placeholder"] as const;

export function hasBillingConfirmationEvidencePath(path: string | undefined): boolean {
  if (path === undefined) return false;
  if (!hasNonSyntheticJsonEvidencePath(path)) return false;
  const normalizedPath = path.toLowerCase();
  return !TEMPLATE_EVIDENCE_MARKERS.some((marker) => normalizedPath.includes(marker));
}
