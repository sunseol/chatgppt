import { redactSensitiveText } from "./redaction";
import type { ExecutionMode, ProviderArtifactProvenance } from "./provider-provenance";
import { lineageReferenceIssues } from "./live-generation-report-reference-uniqueness";
import { lineageFieldSecretIssues } from "./live-generation-report-lineage-secret";
import { slideCoverageIssues } from "./live-generation-report-slide-coverage";
import { textPromptIssues } from "./live-generation-report-text-prompt";
import { productionContaminationIssues } from "./live-generation-report-contamination";

export type LiveGenerationReportLineageIssueCode =
  | "missing_source_trace"
  | "missing_slide_lineage"
  | "duplicate_slide_lineage"
  | "missing_text_turn"
  | "missing_text_prompt_version"
  | "missing_text_artifact"
  | "missing_image_artifact"
  | "duplicate_image_artifact"
  | "image_artifact_slide_mismatch"
  | "missing_image_request"
  | "duplicate_image_request"
  | "duplicate_export_hash"
  | "missing_prompt_version"
  | "invalid_compositor_hash"
  | "invalid_export_hash"
  | "mock_lineage_contamination"
  | "fixture_lineage_contamination"
  | "export_compositor_mismatch"
  | "secret_leak";

export interface LiveGenerationReportLineageIssue {
  readonly code: LiveGenerationReportLineageIssueCode;
  readonly slideNumber?: number;
  readonly message: string;
}

export type LiveGenerationReportLineageValidation =
  | { readonly kind: "ready" }
  | { readonly kind: "blocked"; readonly issues: readonly LiveGenerationReportLineageIssue[] };

export interface LiveSlideReportLineage {
  readonly slideNumber: number;
  readonly sourceIds: readonly string[];
  readonly textArtifactId: string;
  readonly textProviderKind: ProviderArtifactProvenance["providerKind"];
  readonly textTurnId?: string;
  readonly textThreadId?: string;
  readonly textPromptVersion: string;
  readonly imageArtifactId: string;
  readonly imageProviderKind: ProviderArtifactProvenance["providerKind"];
  readonly imageRequestId?: string;
  readonly promptVersion: string;
  readonly fixture: boolean;
  readonly compositorHash: string;
  readonly exportedPngHash: string;
  readonly projectFileContent: string;
}

export function formatLiveGenerationReportLineage(
  slides: readonly LiveSlideReportLineage[],
): string {
  return [
    "## Live Slide Lineage",
    ...slides.flatMap((slide) => [
      `- slide ${slide.slideNumber}`,
      `  - sources ${joinOrNone(slide.sourceIds)}`,
      `  - text turn ${slide.textTurnId ?? "missing"} · thread ${
        slide.textThreadId ?? "missing"
      } · prompt ${slide.textPromptVersion || "missing"} · artifact ${slide.textArtifactId} · ${
        slide.textProviderKind
      }`,
      `  - image request ${slide.imageRequestId ?? "missing"} · artifact ${
        slide.imageArtifactId
      } · ${slide.imageProviderKind}`,
      `  - prompt ${slide.promptVersion || "missing"} · fixture ${slide.fixture ? "yes" : "no"}`,
      `  - compositor ${slide.compositorHash} · export ${slide.exportedPngHash}`,
    ]),
  ].join("\n");
}

export function validateLiveGenerationReportLineage(input: {
  readonly executionMode: ExecutionMode;
  readonly expectedSlideCount?: number;
  readonly slides: readonly LiveSlideReportLineage[];
}): LiveGenerationReportLineageValidation {
  const issues = [
    ...slideCoverageIssues(input.expectedSlideCount, input.slides),
    ...lineageReferenceIssues(input.slides),
    ...input.slides.flatMap((slide) => slideIssues(input.executionMode, slide)),
  ];
  return issues.length === 0 ? { kind: "ready" } : { kind: "blocked", issues };
}

function slideIssues(
  executionMode: ExecutionMode,
  slide: LiveSlideReportLineage,
): readonly LiveGenerationReportLineageIssue[] {
  return [
    ...(slide.sourceIds.some((sourceId) => sourceId.trim())
      ? []
      : [
          {
            code: "missing_source_trace" as const,
            slideNumber: slide.slideNumber,
            message: "Live report requires slide-level source ids.",
          },
        ]),
    ...(slide.textTurnId?.trim() && slide.textThreadId?.trim()
      ? []
      : [
          {
            code: "missing_text_turn" as const,
            slideNumber: slide.slideNumber,
            message: "Live text artifacts require turn and thread ids.",
          },
        ]),
    ...textPromptIssues(slide),
    ...(slide.textArtifactId.trim()
      ? []
      : [
          {
            code: "missing_text_artifact" as const,
            slideNumber: slide.slideNumber,
            message: "Live text lineage requires a text artifact id.",
          },
        ]),
    ...(slide.imageArtifactId.trim()
      ? []
      : [
          {
            code: "missing_image_artifact" as const,
            slideNumber: slide.slideNumber,
            message: "Live image lineage requires an image artifact id.",
          },
        ]),
    ...(imageArtifactMatchesSlide(slide.imageArtifactId, slide.slideNumber)
      ? []
      : [
          {
            code: "image_artifact_slide_mismatch" as const,
            slideNumber: slide.slideNumber,
            message: "Live image artifact id must match the reported slide number.",
          },
        ]),
    ...(slide.imageRequestId?.trim()
      ? []
      : [
          {
            code: "missing_image_request" as const,
            slideNumber: slide.slideNumber,
            message: "Live image artifacts require provider request ids.",
          },
        ]),
    ...(slide.promptVersion.trim()
      ? []
      : [
          {
            code: "missing_prompt_version" as const,
            slideNumber: slide.slideNumber,
            message: "Live report requires the prompt version used for the slide.",
          },
        ]),
    ...(isSha256Digest(slide.compositorHash)
      ? []
      : [
          {
            code: "invalid_compositor_hash" as const,
            slideNumber: slide.slideNumber,
            message: "Compositor PNG hash must be a full SHA-256 digest.",
          },
        ]),
    ...(isSha256Digest(slide.exportedPngHash)
      ? []
      : [
          {
            code: "invalid_export_hash" as const,
            slideNumber: slide.slideNumber,
            message: "Exported PNG hash must be a full SHA-256 digest.",
          },
        ]),
    ...productionContaminationIssues(executionMode, slide),
    ...(slide.compositorHash === slide.exportedPngHash
      ? []
      : [
          {
            code: "export_compositor_mismatch" as const,
            slideNumber: slide.slideNumber,
            message: "Exported PNG must match the compositor result hash.",
          },
        ]),
    ...(redactSensitiveText(slide.projectFileContent) === slide.projectFileContent
      ? []
      : [
          {
            code: "secret_leak" as const,
            slideNumber: slide.slideNumber,
            message: "Project export content contains secret-like text.",
          },
        ]),
    ...lineageFieldSecretIssues(slide),
  ];
}

function joinOrNone(values: readonly string[]): string {
  return values.length === 0 ? "none" : values.join(", ");
}

const isSha256Digest = (value: string): boolean => /^sha256:[a-f0-9]{64}$/.test(value);

function imageArtifactMatchesSlide(imageArtifactId: string, slideNumber: number): boolean {
  if (!imageArtifactId.trim()) return true;
  const match = /^[A-Za-z0-9_-]+_image_slide_(\d{3})_v[1-9]\d*$/.exec(imageArtifactId);
  return match?.[1] === pad3(slideNumber);
}

function pad3(value: number): string {
  return String(value).padStart(3, "0");
}
