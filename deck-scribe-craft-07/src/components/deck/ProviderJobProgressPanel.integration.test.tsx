import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { ProviderJob } from "@/lib/provider-job-manager";
import { ProviderJobProgressPanel } from "./ProviderJobProgressPanel";

describe("provider job progress panel", () => {
  test("renders current stage progress cancel action and partial artifacts", () => {
    const markup = renderToStaticMarkup(
      <ProviderJobProgressPanel
        stageLabel="슬라이드 이미지 생성"
        job={runningJob()}
        recovered={true}
        onCancel={() => undefined}
        onRetry={() => undefined}
      />,
    );

    expect(markup.includes("현재 단계")).toBe(true);
    expect(markup.includes("슬라이드 이미지 생성")).toBe(true);
    expect(markup.includes("진행 상태")).toBe(true);
    expect(markup.includes("job_id")).toBe(false);
    expect(markup.includes("45%")).toBe(true);
    expect(markup.includes("취소 요청")).toBe(true);
    expect(markup.includes("중간 산출물")).toBe(true);
    expect(markup.includes("Slide 1 preview")).toBe(true);
    expect(markup.includes("재시작 복구됨")).toBe(true);
  });

  test("renders retry summary without raw provider logs", () => {
    const markup = renderToStaticMarkup(
      <ProviderJobProgressPanel
        stageLabel="슬라이드 이미지 생성"
        job={{
          ...runningJob(),
          status: "failed",
          finishedAt: 30,
          errorMessage: "temporary provider outage\n    at provider.ts token=sk-secret123456789",
        }}
        recovered={false}
        onCancel={() => undefined}
        onRetry={() => undefined}
      />,
    );

    expect(markup.includes("재시도")).toBe(true);
    expect(markup.includes("실패 요약")).toBe(true);
    expect(markup.includes("temporary provider outage")).toBe(true);
    expect(markup.includes("provider.ts")).toBe(false);
    expect(markup.includes("sk-secret")).toBe(false);
  });

  test("renders provider duration retry count usage and cost estimate", () => {
    const markup = renderToStaticMarkup(
      <ProviderJobProgressPanel
        stageLabel="Live text turn"
        job={{
          ...runningJob(),
          providerId: "codex",
          capability: "deckPlan",
          status: "succeeded",
          startedAt: 10,
          finishedAt: 7_168,
          attempt: 2,
          usageSummary: {
            inputTokens: 25_006,
            outputTokens: 141,
            estimatedCostUsd: 0.04,
          },
        }}
        recovered={false}
        onCancel={() => undefined}
        onRetry={() => undefined}
      />,
    );

    expect(markup.includes("제공자")).toBe(true);
    expect(markup.includes("codex")).toBe(true);
    expect(markup.includes("실행 시간")).toBe(true);
    expect(markup.includes("7158ms")).toBe(true);
    expect(markup.includes("retries 1")).toBe(true);
    expect(markup.includes("input 25006")).toBe(true);
    expect(markup.includes("output 141")).toBe(true);
    expect(markup.includes("cost estimate $0.0400")).toBe(true);
    expect(markup.includes("cost $0.0400")).toBe(false);
  });

  test("renders image API key billing disclosure with image usage", () => {
    const markup = renderToStaticMarkup(
      <ProviderJobProgressPanel
        stageLabel="Live image generation"
        job={{
          ...runningJob(),
          providerId: "openaiImage",
          capability: "imageGeneration",
          status: "succeeded",
          startedAt: 10,
          finishedAt: 1_210,
          usageSummary: {
            imageCount: 5,
            estimatedCostUsd: 0.18,
            imageBillingDisclosure: {
              apiKeyRequired: true,
              userConfirmed: true,
              label: "API key billing confirmed",
            },
          },
        }}
        recovered={false}
        onCancel={() => undefined}
        onRetry={() => undefined}
      />,
    );

    expect(markup.includes("images 5")).toBe(true);
    expect(markup.includes("cost estimate $0.1800")).toBe(true);
    expect(markup.includes("API key billing confirmed")).toBe(true);
  });
});

function runningJob(): ProviderJob {
  return {
    id: "job_panel_running",
    providerId: "mock",
    capability: "imageGeneration",
    description: "슬라이드 이미지 생성",
    status: "running",
    createdAt: 10,
    startedAt: 11,
    attempt: 1,
    progress: { percent: 45, message: "슬라이드 이미지 생성 중" },
    cancelRequested: false,
    partialResult: {
      kind: "preview",
      label: "Slide 1 preview",
      artifactId: "slide_1_preview",
    },
  };
}
