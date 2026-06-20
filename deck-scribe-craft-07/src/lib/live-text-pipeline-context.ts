import type {
  LiveTextPipelineCutoverInput,
  LiveTextPipelineIssue,
  LiveTextPipelineStage,
} from "./live-text-pipeline-cutover";

export function contextConsistencyIssues(
  input: LiveTextPipelineCutoverInput,
): readonly LiveTextPipelineIssue[] {
  return [
    ...artifactContextIssues(input),
    ...slideContextIssues(input),
    ...(matchesCanonicalIdentity(
      input.layoutIr.artifact.designSystemId,
      input.designSystem.artifact.id,
    )
      ? []
      : [
          {
            code: "design_system_mismatch" as const,
            stage: "layout_ir" as const,
            artifactId: input.layoutIr.provenance.artifactId,
            message: "Layout IR designSystemId must match the live Design System artifact id.",
          },
        ]),
    ...(input.layoutIr.artifact.slides.length === input.expectedSlideCount
      ? []
      : [
          {
            code: "slide_count_mismatch" as const,
            stage: "layout_ir" as const,
            artifactId: input.layoutIr.provenance.artifactId,
            message: `Layout IR must contain exactly ${input.expectedSlideCount} slides.`,
          },
        ]),
  ];
}

function artifactContextIssues(
  input: LiveTextPipelineCutoverInput,
): readonly LiveTextPipelineIssue[] {
  return [
    contextIssue(input.deckPlan.deckContextId, input.deckContextId, "deck_plan"),
    contextIssue(input.designSystem.deckContextId, input.deckContextId, "design_system"),
    contextIssue(input.layoutIr.deckContextId, input.deckContextId, "layout_ir"),
  ].filter((issue): issue is LiveTextPipelineIssue => issue !== undefined);
}

function slideContextIssues(input: LiveTextPipelineCutoverInput): readonly LiveTextPipelineIssue[] {
  const slideNumbers = new Set(input.deckPlan.artifact.slides.map((slide) => slide.number));
  return [
    ...(input.slideContextRefs.length === input.expectedSlideCount
      ? []
      : [
          {
            code: "slide_count_mismatch" as const,
            message: `Expected ${input.expectedSlideCount} slide context references.`,
          },
        ]),
    ...input.slideContextRefs.flatMap((ref) => [
      ...(slideNumbers.has(ref.slideNumber)
        ? []
        : [
            {
              code: "slide_count_mismatch" as const,
              slideNumber: ref.slideNumber,
              message: `Slide context reference ${ref.slideNumber} is not in the Deck Plan.`,
            },
          ]),
      ...(matchesCanonicalIdentity(ref.deckContextId, input.deckContextId)
        ? []
        : [
            {
              code: "deck_context_mismatch" as const,
              slideNumber: ref.slideNumber,
              message: "Every slide context reference must share the same deckContextId.",
            },
          ]),
      ...(matchesCanonicalIdentity(ref.designSystemId, input.designSystem.artifact.id)
        ? []
        : [
            {
              code: "design_system_mismatch" as const,
              slideNumber: ref.slideNumber,
              message: "Every slide context reference must share the same designSystemId.",
            },
          ]),
    ]),
  ];
}

function contextIssue(
  actual: string,
  expected: string,
  stage: LiveTextPipelineStage,
): LiveTextPipelineIssue | undefined {
  if (matchesCanonicalIdentity(actual, expected)) return undefined;
  return {
    code: "deck_context_mismatch",
    stage,
    message: "Every text pipeline artifact must share the same deckContextId.",
  };
}

function matchesCanonicalIdentity(actual: string, expected: string): boolean {
  return actual === actual.trim() && expected === expected.trim() && actual === expected;
}
