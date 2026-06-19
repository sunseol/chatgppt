import type { Claim, InterviewBrief, ResearchPack } from "./deck-types";
import { validateLiveResearchEvidence } from "./live-research-evidence";
import { validateResearchPack } from "./research-validator";

export interface BuildDeckPlanPromptInput {
  readonly brief: InterviewBrief;
  readonly research: ResearchPack;
}

export interface DeckPlanPromptPackage {
  readonly prompt: string;
  readonly slideCount: number;
  readonly usableClaims: readonly Claim[];
  readonly excludedClaims: readonly Claim[];
}

const MIN_SLIDES = 5;
const MAX_SLIDES = 12;

export function buildDeckPlanPrompt(input: BuildDeckPlanPromptInput): DeckPlanPromptPackage {
  const slideCount = clampSlideCount(input.brief.slideCount);
  const invalidClaimIds = collectInvalidClaimIds(input.research);
  const { usableClaims, excludedClaims } = partitionClaims(input.research.claims, invalidClaimIds);

  return Object.freeze({
    prompt: buildPrompt(input.brief, input.research, slideCount, usableClaims, excludedClaims),
    slideCount,
    usableClaims: Object.freeze([...usableClaims]),
    excludedClaims: Object.freeze([...excludedClaims]),
  });
}

function clampSlideCount(slideCount: number): number {
  return Math.min(MAX_SLIDES, Math.max(MIN_SLIDES, slideCount));
}

function collectInvalidClaimIds(research: ResearchPack): ReadonlySet<string> {
  const report = validateResearchPack(research);
  const liveReport =
    research.liveEvidenceRefs === undefined
      ? undefined
      : validateLiveResearchEvidence({
          pack: research,
          evidenceRefs: research.liveEvidenceRefs,
        });
  return new Set(
    [...report.fatalIssues, ...(liveReport?.fatalIssues ?? [])]
      .map((issue) => issue.claimId)
      .filter((claimId) => claimId !== undefined),
  );
}

function partitionClaims(claims: readonly Claim[], invalidClaimIds: ReadonlySet<string>) {
  const usableClaims: Claim[] = [];
  const excludedClaims: Claim[] = [];

  for (const claim of claims) {
    if (isUsableClaim(claim, invalidClaimIds)) {
      usableClaims.push(claim);
    } else {
      excludedClaims.push(claim);
    }
  }

  return { usableClaims, excludedClaims };
}

function isUsableClaim(claim: Claim, invalidClaimIds: ReadonlySet<string>): boolean {
  return (
    !invalidClaimIds.has(claim.id) &&
    claim.status === "supported" &&
    claim.confidence !== "assumption" &&
    (claim.sourceIds.length > 0 || claim.datasetIds.length > 0)
  );
}

function buildPrompt(
  brief: InterviewBrief,
  research: ResearchPack,
  slideCount: number,
  usableClaims: readonly Claim[],
  excludedClaims: readonly Claim[],
): string {
  return [
    "# Deck Plan Generation Package",
    "",
    "## Approved Brief",
    `Goal: ${brief.goal}`,
    `Audience: ${brief.audience}`,
    `Desired outcome: ${brief.desiredOutcome}`,
    `Slide count: ${slideCount}`,
    `Aspect ratio: ${brief.aspectRatio}`,
    `Language: ${brief.language}`,
    `Tone: ${joinOrNone(brief.tone)}`,
    `Must include: ${joinOrNone(brief.mustInclude)}`,
    `Must avoid: ${joinOrNone(brief.mustAvoid)}`,
    `Success criteria: ${joinOrNone(brief.successCriteria)}`,
    "",
    "## Required Output Contract",
    "Return slide-by-slide markdown only.",
    `Create exactly ${slideCount} slides.`,
    "Each slide MUST include: role, core message, visual direction, evidence, editable elements.",
    "Each slide must also include body points and data/source constraints.",
    "Every evidence reference MUST use claim, source, or dataset ids from Usable Research Claims.",
    "Do not include unsupported factual claims, uncited numbers, or claims listed as excluded.",
    "Keep editable elements concrete enough for downstream vector editing.",
    "",
    "## Usable Research Claims",
    ...formatUsableClaims(usableClaims),
    "",
    "## Source Map",
    ...research.sources.map(
      (source) =>
        `${source.id} | grade ${source.grade} | ${source.publisher} (${source.year}) | ${source.title}`,
    ),
    "",
    "## Dataset Map",
    ...formatDatasets(research),
    "",
    "## Excluded Claim Ids",
    ...formatExcludedClaims(excludedClaims),
    "",
    "## Markdown Slide Template",
    "### Slide {number}. {title}",
    "- role: {deck role such as Cover, Problem, Market, Solution, Proof, Closing}",
    "- core message: {one evidenced message; cite claim ids for factual statements}",
    "- body points: {2-4 concise bullets compressed into a comma-separated list}",
    "- visual direction: {chart, table, diagram, comparison, timeline, or text composition}",
    "- evidence: {claim_id, source_id, dataset_id, or none for purely structural slides}",
    "- editable elements: {text, chart values, labels, shapes, icons, captions}",
    "- data/source constraints: {required claim/source/dataset ids or why no factual evidence is used}",
  ].join("\n");
}

function formatUsableClaims(claims: readonly Claim[]): string[] {
  if (claims.length === 0) return ["None"];
  return claims.map(
    (claim) =>
      `${claim.id} | ${joinIds(claim.sourceIds)} | ${joinIds(claim.datasetIds)} | ${claim.statement}`,
  );
}

function formatDatasets(research: ResearchPack): string[] {
  if (research.datasets.length === 0) return ["None"];
  return research.datasets.map(
    (dataset) =>
      `${dataset.id} | ${dataset.period} | ${dataset.geography} | ${dataset.unit} | ${dataset.title}`,
  );
}

function formatExcludedClaims(claims: readonly Claim[]): string[] {
  if (claims.length === 0) return ["None"];
  return claims.map((claim) => `${claim.id} | excluded from factual planning evidence`);
}

function joinOrNone(values: readonly string[]): string {
  return values.length === 0 ? "None" : values.join(", ");
}

function joinIds(values: readonly string[]): string {
  return values.length === 0 ? "none" : values.join(",");
}
