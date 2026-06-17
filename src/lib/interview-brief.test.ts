import { describe, expect, test } from "bun:test";
import { createApprovedInterviewBriefArtifact, parseInterviewBrief } from "./interview-brief";
import type { InterviewBrief } from "./deck-types";

function sampleBrief(): InterviewBrief {
  return {
    id: "brief_1",
    goal: "투자 유치용 피치덱",
    audience: "초기 VC 및 투자자",
    desiredOutcome: "후속 미팅 요청",
    slideCount: 8,
    aspectRatio: "16:9",
    language: "ko",
    tone: ["전문적", "데이터 기반"],
    mustInclude: ["문제 정의", "시장", "솔루션"],
    mustAvoid: ["과장된 수치"],
    successCriteria: ["후속 미팅 요청"],
    openQuestions: [],
  };
}

describe("interview brief schema", () => {
  test("parses a valid interview brief", () => {
    const brief = sampleBrief();

    expect(parseInterviewBrief(brief)).toEqual(brief);
  });

  test("rejects missing required fields", () => {
    expect(() => parseInterviewBrief({ id: "brief_invalid" })).toThrow();
  });

  test("locks approved brief as an immutable versioned artifact", () => {
    const draft = sampleBrief();

    const artifact = createApprovedInterviewBriefArtifact({
      projectId: "p_test",
      brief: draft,
      version: 2,
      approvedAt: 100,
    });
    draft.goal = "mutated draft";
    draft.mustInclude.push("mutated include");

    expect(artifact.record).toEqual({
      id: "p_test_brief_v2",
      projectId: "p_test",
      type: "brief",
      version: 2,
      hash: artifact.record.hash,
      path: "projects/p_test/briefs/brief.v2.json",
      createdAt: 100,
    });
    expect(artifact.brief.goal).toBe("투자 유치용 피치덱");
    expect(artifact.brief.mustInclude.includes("mutated include")).toBe(false);
    expect(Object.isFrozen(artifact.brief)).toBe(true);
  });
});
