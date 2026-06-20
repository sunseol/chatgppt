import { describe, expect, test } from "bun:test";
import type { DeckProject, InterviewBrief } from "./deck-types";
import { createLiveInterviewReadyArtifactPatch } from "./desktop-live-interview-workflow";
import type { LiveTextArtifactRecord, LiveTextArtifactType } from "./live-text-artifact-record";

describe("desktop live interview artifact patch", () => {
  test("preserves question and brief artifact records when the ready interview patch is applied", () => {
    const project = projectFixture({
      liveTextArtifacts: [record("old_questions", "interview_questions")],
    });

    const patch = createLiveInterviewReadyArtifactPatch(
      project,
      { stage: "INTERVIEW_APPROVAL_PENDING", brief: briefFixture() },
      [record("new_questions", "interview_questions"), record("new_brief", "interview_brief")],
    );

    expect(patch.stage).toBe("INTERVIEW_APPROVAL_PENDING");
    expect(patch.brief.id).toBe("brief_ready");
    expect(patch.liveTextArtifacts.map((artifact) => artifact.artifactId)).toEqual([
      "old_questions",
      "new_questions",
      "new_brief",
    ]);
  });
});

function projectFixture(patch: Partial<DeckProject> = {}): DeckProject {
  return {
    id: "p_ready_interview",
    name: "Ready Interview",
    initialPrompt: "임원 보고 덱을 만들어줘.",
    aspectRatio: "16:9",
    language: "ko",
    slideCount: 5,
    stage: "INTERVIEWING",
    createdAt: 1_789_300_000,
    updatedAt: 1_789_300_000,
    invalidated: {},
    approvalLog: [],
    ...patch,
  };
}

function briefFixture(): InterviewBrief {
  return {
    id: "brief_ready",
    goal: "성과 리뷰",
    audience: "임원",
    desiredOutcome: "예산 승인",
    slideCount: 5,
    aspectRatio: "16:9",
    language: "ko",
    tone: ["절제된"],
    mustInclude: ["채널별 성과"],
    mustAvoid: ["출처 없는 성과 과장"],
    successCriteria: ["승인 가능한 명확성"],
    openQuestions: [],
  };
}

function record(artifactId: string, artifactType: LiveTextArtifactType): LiveTextArtifactRecord {
  return {
    artifactId,
    projectId: "p_ready_interview",
    artifactType,
    version: 1,
    hash: `sha256:${artifactId}`,
    path: `projects/p_ready_interview/briefs/${artifactId}.json`,
    createdAt: 1_789_350_000_000,
  };
}
