import { describe, expect, test } from "bun:test";
import type { DeckProject, GeneratedSlide } from "./deck-types";
import { createReviewEvidenceProjectPatch } from "./live-slide-regeneration-review-state";
import { createDeckProject } from "./project-creation";
import { parseProjectList, serializeProjectList } from "./project-list-codec";

describe("live slide regeneration review evidence state", () => {
  test("persists review evidence paths with the slide update patch", () => {
    // Given
    const project = {
      ...createDeckProject(
        {
          name: "DF-235 review evidence",
          initialPrompt: "Persist regeneration review evidence",
          slideCount: 5,
          aspectRatio: "16:9",
          language: "ko",
        },
        { createId: () => "project_001", now: () => 1_789_930_000 },
      ),
      liveSlideRegenerationReviewEvidence: [
        {
          path: "projects/project_001/live-evidence/df235-slide-regeneration-review-old.json",
          slideNumber: 1,
          outcome: "approved" as const,
        },
      ],
    } satisfies DeckProject;
    const slides: readonly GeneratedSlide[] = [
      { number: 3, version: 2, status: "approved", imageDescriptor: "live-regeneration|v2" },
    ];

    // When
    const patch = createReviewEvidenceProjectPatch({
      project,
      slides,
      reviewEvidencePath:
        "projects/project_001/live-evidence/df235-slide-regeneration-review-rev_235.json",
      slideNumber: 3,
      outcome: "approved",
    });

    // Then
    expect(patch.slides).toEqual(slides);
    expect(patch.liveSlideRegenerationReviewEvidence).toEqual([
      {
        path: "projects/project_001/live-evidence/df235-slide-regeneration-review-old.json",
        slideNumber: 1,
        outcome: "approved",
      },
      {
        path: "projects/project_001/live-evidence/df235-slide-regeneration-review-rev_235.json",
        slideNumber: 3,
        outcome: "approved",
      },
    ]);
    const restored = parseProjectList(serializeProjectList([{ ...project, ...patch }]));
    expect(restored[0]?.liveSlideRegenerationReviewEvidence?.at(-1)?.path).toBe(
      "projects/project_001/live-evidence/df235-slide-regeneration-review-rev_235.json",
    );
  });

  test("does not persist generic or local review evidence paths", () => {
    // Given
    const project = createDeckProject(
      {
        name: "DF-235 review evidence",
        initialPrompt: "Reject fake regeneration review evidence",
        slideCount: 5,
        aspectRatio: "16:9",
        language: "ko",
      },
      { createId: () => "project_001", now: () => 1_789_930_000 },
    );
    const slides: readonly GeneratedSlide[] = [
      { number: 3, version: 2, status: "approved", imageDescriptor: "live-regeneration|v2" },
    ];

    // When
    const genericPatch = createReviewEvidenceProjectPatch({
      project,
      slides,
      reviewEvidencePath: "projects/project_001/live-evidence/df235-slide-regeneration-review.json",
      slideNumber: 3,
      outcome: "approved",
    });
    const localPatch = createReviewEvidenceProjectPatch({
      project,
      slides,
      reviewEvidencePath: "/Users/jake/df235-slide-regeneration-review-rev_235.json",
      slideNumber: 3,
      outcome: "approved",
    });

    // Then
    expect(genericPatch).toEqual({ slides });
    expect(localPatch).toEqual({ slides });
  });

  test("does not persist review evidence paths that rely on boundary whitespace", () => {
    // Given
    const project = createDeckProject(
      {
        name: "DF-235 review evidence",
        initialPrompt: "Reject padded regeneration review evidence",
        slideCount: 5,
        aspectRatio: "16:9",
        language: "ko",
      },
      { createId: () => "project_001", now: () => 1_789_930_000 },
    );
    const slides: readonly GeneratedSlide[] = [
      { number: 3, version: 2, status: "approved", imageDescriptor: "live-regeneration|v2" },
    ];

    // When
    const patch = createReviewEvidenceProjectPatch({
      project,
      slides,
      reviewEvidencePath:
        " projects/project_001/live-evidence/df235-slide-regeneration-review-rev_235.json ",
      slideNumber: 3,
      outcome: "approved",
    });

    // Then
    expect(patch).toEqual({ slides });
  });
});
