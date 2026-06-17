import { describe, expect, test } from "bun:test";
import type { ApprovalLogEntry, DeckPlan } from "./deck-types";
import { createApprovedPlan, createPlanDraftUpdate } from "./plan-stage-model";

describe("plan editor model", () => {
  test("saves user-edited markdown as parsed slide specs", () => {
    const result = createPlanDraftUpdate({
      plan: planFixture(),
      markdown: deckPlanMarkdown("운영 자동화로 이동 중이다."),
    });

    expect(result.parseResult.valid).toBe(true);
    expect(result.plan.markdown.includes("운영 자동화로 이동 중이다.")).toBe(true);
    expect(result.plan.slides[0]?.coreMessage).toBe("운영 자동화로 이동 중이다.");
  });

  test("creates approved artifact metadata with incrementing version", () => {
    const existing: ApprovalLogEntry[] = [
      {
        stage: "plan",
        at: 1,
        hash: "sha256:previous",
        artifactId: "p_1_plan_v1",
        artifactVersion: 1,
        artifactType: "plan",
      },
    ];

    const result = createApprovedPlan({
      projectId: "p_1",
      plan: planFixture(),
      markdown: deckPlanMarkdown("승인 가능한 핵심 메시지"),
      existingApprovals: existing,
      approvedAt: 100,
    });

    expect(result.kind).toBe("approved");
    if (result.kind !== "approved") return;
    expect(result.artifact.version).toBe(2);
    expect(result.artifact.type).toBe("plan");
    expect(result.plan.approvedHash).toBe(result.artifact.hash);
    expect(result.plan.slides[0]?.coreMessage).toBe("승인 가능한 핵심 메시지");
  });

  test("marks downstream invalidation for plan edits", () => {
    const result = createPlanDraftUpdate({
      plan: planFixture(),
      markdown: deckPlanMarkdown("수정된 메시지"),
    });

    expect(result.invalidated).toEqual({
      design: true,
      layout: true,
      generate: true,
      review: true,
      vectorize: true,
      editor: true,
      export: true,
    });
  });
});

function planFixture(): DeckPlan {
  return {
    id: "plan_001",
    markdown: deckPlanMarkdown("기존 메시지"),
    slides: [],
  };
}

function deckPlanMarkdown(coreMessage: string): string {
  return [
    "# Deck Plan",
    "",
    "## Slide 1. Market",
    "- 제목: 시장 변화가 만드는 기회",
    "- 역할: 시장 근거 제시",
    `- 핵심 메시지: ${coreMessage}`,
    "- 본문 포인트: 파일럿 증가, 운영 자동화 수요",
    "- 시각화 방향: 막대 차트 + 인사이트 카드",
    "- 사용할 근거: claim_001, src_001, dataset_001",
    "- 편집 가능 요소: 수치, 인사이트, 캡션",
    "- 데이터/출처 제약: claim_001, src_001, dataset_001",
  ].join("\n");
}
