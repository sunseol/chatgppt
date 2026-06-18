import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { GenerateStage } from "./GenerateStage";
import type { DeckProject } from "@/lib/deck-types";

describe("generate stage production gate", () => {
  test("blocks production generation until a real image path is locked", () => {
    // Given
    const project = generateProjectFixture();

    // When
    const markup = renderToStaticMarkup(
      <GenerateStage project={project} executionMode="production" />,
    );

    // Then
    expect(markup.includes("실제 이미지 경로 Lock 필요")).toBe(true);
    expect(
      markup.includes("Production image generation requires a locked image path decision"),
    ).toBe(true);
  });
});

function generateProjectFixture(): DeckProject {
  return {
    id: "project_001",
    name: "Generate Gate",
    initialPrompt: "Build a deck",
    aspectRatio: "16:9",
    language: "ko",
    slideCount: 1,
    stage: "GENERATING_SLIDES",
    createdAt: 1_789_700_000,
    updatedAt: 1_789_700_000,
    invalidated: {},
    approvalLog: [],
  };
}
