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

  test("shows completed progress when generated slides already exist", () => {
    // Given
    const project = {
      ...generateProjectFixture(),
      slides: [
        {
          number: 1,
          version: 1,
          status: "ready",
          imageDescriptor: "cover|title|message",
        },
      ],
    } satisfies DeckProject;

    // When
    const markup = renderToStaticMarkup(
      <GenerateStage project={project} executionMode="development" />,
    );

    // Then
    expect(markup.includes("100%")).toBe(true);
    expect(markup.includes(">0%</div>")).toBe(false);
  });

  test("allows native production runner to create the first image path decision", () => {
    // Given
    const project = generateProjectFixture();

    // When
    const markup = renderToStaticMarkup(
      <GenerateStage
        project={project}
        executionMode="production"
        runLiveGeneration={async () => ({ kind: "blocked", issues: [] })}
      />,
    );

    // Then
    expect(markup.includes("실제 이미지 경로 Lock 필요")).toBe(false);
    expect(markup.includes("실제 이미지 경로 결정 레코드가 필요합니다.")).toBe(false);
    expect(markup.includes("승인한 레이아웃으로 슬라이드 이미지 생성")).toBe(true);
  });

  test("does not fall back to mock generation when production image transport is missing", () => {
    // Given
    const project = {
      ...generateProjectFixture(),
      plan: {
        id: "plan_001",
        markdown: "# Plan",
        approvedHash: "sha256:plan",
        slides: [
          {
            number: 1,
            title: "시장 기회",
            role: "Market",
            coreMessage: "라이브 이미지가 필요하다",
            visualType: "chart",
            evidence: [],
            editableElements: [],
          },
        ],
      },
      design: {
        id: "design_001",
        canvas: { ratio: "16:9", w: 1600, h: 900, safeMargin: { x: 96, y: 72 } },
        grid: { columns: 12, gutter: 24 },
        colors: {
          background: "#ffffff",
          textPrimary: "#111111",
          textSecondary: "#555555",
          primary: "#222222",
          secondary: "#eeeeee",
          accent: "#0f766e",
        },
        typography: {
          titleStyle: "serif",
          bodyStyle: "sans",
          title: { style: "serif", minPx: 44, maxPx: 72 },
          body: { style: "sans", minPx: 24, maxPx: 36 },
          caption: { style: "sans", minPx: 14, maxPx: 20 },
          number: { style: "sans", minPx: 36, maxPx: 64 },
        },
        layoutRules: [],
        componentRules: [],
        visualLanguage: "editorial",
        negativeRules: [],
        approvedHash: "sha256:design",
      },
      imagePathDecision: {
        decisionId: "decision_001",
        decidedAt: 1_789_700_000,
        status: "locked",
        providerId: "openaiImage",
        authMode: "openaiApiKey",
        model: "gpt-image-2",
        billingOwner: "DeckForge QA",
        requiredPermissions: ["images.generate"],
        organizationVerification: "verified",
        fixtureFallbackAllowed: false,
        excludedRoutes: [],
        blockers: [],
        binaryArtifactPath: "projects/project_001/slides/images/slide_001.v1.png",
        requestId: "img_req_preflight_001",
      },
    } satisfies DeckProject;

    // When
    const markup = renderToStaticMarkup(
      <GenerateStage project={project} executionMode="production" />,
    );

    // Then
    expect(markup.includes("OpenAI 이미지 transport 필요")).toBe(true);
    expect(markup.includes("mock 경로로 대체하지 않습니다.")).toBe(true);
    expect(markup.includes("네이티브 OpenAI image transport 연결 필요")).toBe(true);
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
