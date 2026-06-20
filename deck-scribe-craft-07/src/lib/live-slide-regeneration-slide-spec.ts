import { hashContent } from "./artifacts";
import type { SlideSpec } from "./deck-types";
import type {
  LiveSlideRegenerationIssue,
  LiveSlideRegenerationRequest,
} from "./live-slide-regeneration";

export function candidateSlideSpecIssues(
  request: LiveSlideRegenerationRequest,
  candidateSlideSpec: SlideSpec,
): readonly LiveSlideRegenerationIssue[] {
  const candidateHash = hashContent(JSON.stringify(candidateSlideSpec));
  return candidateSlideSpec.number === request.slideNumber &&
    candidateHash === request.slideSpecHash
    ? []
    : [
        {
          code: "slide_spec_mismatch",
          slideNumber: request.slideNumber,
          message: "Regeneration candidate must keep the approved slide spec.",
        },
      ];
}
