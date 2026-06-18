import type { DeckProject } from "./deck-types";
import type { LiveInterviewAnswerMap } from "./live-interview-cutover";

export function createLiveInterviewAnswerMap(
  project: Pick<DeckProject, "brief" | "initialPrompt">,
): LiveInterviewAnswerMap {
  const brief = project.brief;
  if (brief === undefined) return {};

  return {
    goal: brief.goal,
    audience: brief.audience,
    desiredOutcome: brief.desiredOutcome,
    coreMessage: project.initialPrompt,
    slideCount: brief.slideCount.toString(),
    aspectRatio: brief.aspectRatio,
    language: brief.language,
    tone: brief.tone.join(", "),
    mustInclude: brief.mustInclude.join(", "),
    mustAvoid: brief.mustAvoid.join(", "),
    successCriteria: brief.successCriteria.join(", "),
  };
}
