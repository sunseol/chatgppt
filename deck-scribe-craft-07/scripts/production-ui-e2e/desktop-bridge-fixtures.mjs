import { generateDesignSystemFromPlan } from "../../src/lib/design-system-generator.ts";
import { createLayoutIrFromPlan } from "../../src/lib/layout-ir.ts";

export function researchPackPayload() {
  return {
    id: "production_ui_e2e_research_pack",
    sources: [
      {
        id: "src_openai_image_generation",
        title: "OpenAI image generation product information",
        publisher: "OpenAI",
        year: 2026,
        grade: "A",
        sourceType: "company",
        usePolicy: "priority",
        url: "https://openai.com/",
        capture: {
          originalUrl: "https://openai.com/",
          finalUrl: "https://openai.com/",
          fetchedAt: 1_789_810_001,
          mimeType: "text/html",
          statusCode: 200,
          contentHash: "sha256:production-ui-e2e-openai-image-raw",
          rawArchivePath: "docs/live-source-capture-bundle/production-ui-e2e/original.html",
          textArchivePath: "docs/live-source-capture-bundle/production-ui-e2e/extracted.txt",
          extractedTextHash: "sha256:production-ui-e2e-openai-image-text",
          version: 1,
        },
      },
    ],
    claims: [
      {
        id: "claim_openai_image_generation",
        statement: "OpenAI provides image generation capabilities for product workflows.",
        sourceIds: ["src_openai_image_generation"],
        datasetIds: ["dataset_image_workflow"],
        confidence: "high",
        hasNumber: true,
        needsUserReview: false,
        status: "supported",
        slideCandidates: [2],
        numericEvidence: [
          {
            id: "num_required_slide_count",
            value: "5",
            unit: "slides",
            baseYear: 2026,
            geography: "Global",
            definition: "DeckForge MVP image-to-PPT Golden Path slide count",
            sourceId: "src_openai_image_generation",
            datasetId: "dataset_image_workflow",
          },
        ],
      },
    ],
    datasets: [
      {
        id: "dataset_image_workflow",
        title: "Image-to-PPT Golden Path coverage",
        sourceIds: ["src_openai_image_generation"],
        unit: "slides",
        period: "2026",
        geography: "Global",
        definition: "Slides required for MVP Golden Path local production evidence",
        rows: [{ label: "MVP", value: 5, year: 2026 }],
        uncertain: false,
      },
    ],
    charts: [
      {
        id: "chart_image_workflow",
        title: "Image-to-PPT Golden Path coverage",
        chartType: "bar",
        datasetId: "dataset_image_workflow",
        unit: "slides",
        period: "2026",
        sourceIds: ["src_openai_image_generation"],
        slideCandidates: [2],
        uncertain: false,
      },
    ],
    factCheckReport: {
      summary: "Local production E2E bridge produced approval-ready research evidence.",
      generatedAt: 1_789_810_002,
      fatalIssueCount: 0,
      issues: [],
      uncertainItems: [],
    },
    liveEvidenceRefs: [
      {
        id: "ev_openai_image_generation_quote",
        claimId: "claim_openai_image_generation",
        sourceId: "src_openai_image_generation",
        sourceArtifactPath: "docs/live-source-capture-bundle/production-ui-e2e/original.html",
        kind: "quote_span",
        quoteSpan: {
          start: 0,
          end: 24,
          text: "image generation capabilities",
        },
        datasetId: "dataset_image_workflow",
      },
    ],
  };
}

export function deckPlanPayload() {
  return { markdown: productionDeckPlan().markdown };
}

export function designSystemPayload() {
  return productionDesignSystem();
}

export function layoutIrPayload() {
  return {
    ...productionLayoutIr(),
    id: "production_ui_e2e_layout_ir",
  };
}

function productionBrief() {
  return {
    id: "production_ui_e2e_brief",
    goal: "제품 피치덱 작성",
    audience: "초기 VC",
    desiredOutcome: "후속 미팅",
    slideCount: 5,
    aspectRatio: "16:9",
    language: "ko",
    tone: ["명료한", "제품 중심"],
    mustInclude: ["문제", "솔루션", "GPT 이미지 생성", "PPT export"],
    mustAvoid: ["출처 없는 수치"],
    successCriteria: ["후속 미팅 요청"],
    openQuestions: [],
    approvedHash: "sha256:production-ui-e2e-brief",
  };
}

function productionDeckPlan() {
  const slides = productionSlides();
  const markdown = markdownForSlides(slides);
  return {
    id: "production_ui_e2e_deck_plan",
    markdown,
    slides,
    approvedHash: "sha256:production-ui-e2e-plan",
  };
}

function productionDesignSystem() {
  const generated = generateDesignSystemFromPlan({
    brief: productionBrief(),
    plan: productionDeckPlan(),
  });
  if (generated.kind !== "ready") throw new Error("Expected production E2E design fixture.");
  return {
    ...generated.design,
    id: "production_ui_e2e_design_system",
  };
}

function productionLayoutIr() {
  return createLayoutIrFromPlan({
    plan: productionDeckPlan(),
    design: productionDesignSystem(),
  });
}

function productionSlides() {
  return [
    slide(
      1,
      "GPT 이미지 생성 PPT",
      "Cover",
      "GPT 이미지 생성으로 편집 가능한 PPT 초안을 만든다.",
      [],
    ),
    slide(2, "문제", "Problem", "AI PPT 결과물은 이미지 품질과 편집 가능성이 동시에 깨지기 쉽다.", [
      "claim_openai_image_generation",
      "dataset_image_workflow",
    ]),
    slide(
      3,
      "솔루션",
      "Solution",
      "DeckForge는 조사, 기획, 디자인, 레이아웃 승인을 거쳐 이미지 생성과 PPT export를 연결한다.",
      ["claim_openai_image_generation"],
    ),
    slide(
      4,
      "핵심 워크플로우",
      "Product",
      "승인 기반 파이프라인이 GPT 이미지 생성 전후의 품질 기준을 고정한다.",
      ["claim_openai_image_generation"],
    ),
    slide(
      5,
      "이미지 생성 범위",
      "Capability",
      "MVP는 5장 배경 생성과 PPT export 검증을 릴리즈 판단 단위로 삼는다.",
      ["claim_openai_image_generation", "dataset_image_workflow"],
    ),
  ];
}

function slide(number, title, role, coreMessage, evidence) {
  const hasDataset = evidence.some((item) => item.startsWith("dataset_"));
  return {
    number,
    title,
    role,
    coreMessage,
    bodyPoints: ["사용자 승인 흐름", "생성 증거", "PPT 편집 가능성"],
    visualType: hasDataset ? "bar chart" : "key message",
    visualComposition: hasDataset ? "bar chart with evidence caption" : "key message layout",
    evidence: [...evidence],
    editableElements: ["title", "body text", "source caption", "layout shapes"],
    dataSourceConstraints: evidence.length > 0 ? [...evidence] : ["structural slide"],
  };
}

function markdownForSlides(slides) {
  return [
    "# Deck Plan",
    "",
    ...slides.flatMap((item) => [
      `## Slide ${item.number}. ${item.title}`,
      `- role: ${item.role}`,
      `- core message: ${item.coreMessage}`,
      `- body points: ${item.bodyPoints.join(", ")}`,
      `- visual direction: ${item.visualComposition}`,
      `- evidence: ${item.evidence.length > 0 ? item.evidence.join(", ") : "none"}`,
      `- editable elements: ${item.editableElements.join(", ")}`,
      `- data/source constraints: ${item.dataSourceConstraints.join(", ")}`,
      "",
    ]),
  ].join("\n");
}
