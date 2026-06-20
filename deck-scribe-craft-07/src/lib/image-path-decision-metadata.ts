import type {
  ImageProviderFeasibilityDecision,
  OrganizationVerification,
} from "./image-provider-feasibility";
import type { ImagePathBlocker } from "./image-path-decision";

const PLACEHOLDER_DECISION_TEXTS = new Set(
  "n/a|na|none|not set|tbd|to be determined|unknown".split("|"),
);

export function decisionMetadataBlockers(input: {
  readonly organizationVerification: OrganizationVerification;
  readonly billingOwner: string;
  readonly requiredPermissions: readonly string[];
  readonly feasibility: ImageProviderFeasibilityDecision;
}): readonly ImagePathBlocker[] {
  return [
    ...(input.feasibility.authMode === "openaiApiKey" &&
    input.feasibility.setup === "ready" &&
    input.organizationVerification !== "verified"
      ? [
          {
            code: "requiresOrganizationVerification" as const,
            message:
              "OpenAI image route evidence must retain verified organization status before locking.",
          },
        ]
      : []),
    ...(isMeaningfulDecisionText(input.billingOwner)
      ? []
      : [
          {
            code: "missing_billing_owner" as const,
            message: "The image path decision must record the billing owner.",
          },
        ]),
    ...(input.requiredPermissions.length > 0 &&
    input.requiredPermissions.every(isMeaningfulDecisionText)
      ? []
      : [
          {
            code: "missing_required_permissions" as const,
            message: "The image path decision must record required provider permissions.",
          },
        ]),
  ];
}

function isMeaningfulDecisionText(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 && !PLACEHOLDER_DECISION_TEXTS.has(normalized);
}
