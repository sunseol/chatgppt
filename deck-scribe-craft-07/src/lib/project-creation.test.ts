import { describe, expect, test } from "bun:test";
import { createDeckProject, ProjectCreationInputError } from "./project-creation";

describe("project creation", () => {
  test("creates a deterministic PROJECT_CREATED project from normalized input", () => {
    const project = createDeckProject(
      {
        name: "  Investor pitch  ",
        initialPrompt: "  Build a verified pitch deck.  ",
        slideCount: 8,
        aspectRatio: "16:9",
        language: "ko",
      },
      {
        createId: () => "p_fixed",
        now: () => 1234,
      },
    );

    expect(project).toEqual({
      id: "p_fixed",
      name: "Investor pitch",
      initialPrompt: "Build a verified pitch deck.",
      slideCount: 8,
      aspectRatio: "16:9",
      language: "ko",
      stage: "PROJECT_CREATED",
      createdAt: 1234,
      updatedAt: 1234,
      invalidated: {},
      approvalLog: [],
    });
  });

  test("clamps slide count to the MVP range", () => {
    const low = createDeckProject(
      {
        name: "Low",
        initialPrompt: "Make slides",
        slideCount: 2,
        aspectRatio: "4:3",
        language: "en",
      },
      { createId: () => "p_low", now: () => 1 },
    );
    const high = createDeckProject(
      {
        name: "High",
        initialPrompt: "Make slides",
        slideCount: 30,
        aspectRatio: "16:9",
        language: "mixed",
      },
      { createId: () => "p_high", now: () => 2 },
    );

    expect(low.slideCount).toBe(5);
    expect(high.slideCount).toBe(12);
  });

  test("rejects blank project name or prompt", () => {
    expect(() =>
      createDeckProject(
        {
          name: " ",
          initialPrompt: "Make slides",
          slideCount: 8,
          aspectRatio: "16:9",
          language: "ko",
        },
        { createId: () => "p_blank", now: () => 1 },
      ),
    ).toThrow(ProjectCreationInputError);
  });
});
