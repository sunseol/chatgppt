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
