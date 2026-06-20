import {
  backgroundArtifactTargetsSlide,
  type FinalSlideComposition,
} from "@/lib/final-slide-compositor";
import type { ReviewGalleryItem } from "./review-gallery-model";
import type { ReviewGalleryLiveCompositionIssue } from "./review-gallery-live-validation";

export function storedBackgroundArtifactIdentityIssues(
  items: readonly ReviewGalleryItem[],
): readonly ReviewGalleryLiveCompositionIssue[] {
  const seenSlides = new Set<number>();
  const seen = new Set<string>();
  return items.flatMap((item) => {
    if (seenSlides.has(item.slide.number)) return [];
    seenSlides.add(item.slide.number);
    const artifact = item.composition?.backgroundArtifact;
    if (artifact === undefined) return [];
    const identities = [artifact.artifactId, artifact.path, artifact.hash];
    const duplicate = identities.some((identity) => seen.has(identity));
    for (const identity of identities) seen.add(identity);
    return duplicate
      ? [
          {
            code: "duplicate_stored_background_artifact" as const,
            slideNumber: item.slide.number,
            message:
              "Review gallery stored background artifact ids, paths, and hashes must be unique.",
          },
        ]
      : [];
  });
}

export function backgroundIssues(
  composition: FinalSlideComposition,
): readonly ReviewGalleryLiveCompositionIssue[] {
  if (composition.backgroundProviderId === "mock") {
    return [
      {
        code: "mock_background_artifact",
        slideNumber: composition.slideNumber,
        message: "Live review must use a real image artifact background.",
      },
    ];
  }
  if (composition.backgroundProviderId !== "openaiImage") {
    return [
      {
        code: "background_provider_not_live_image",
        slideNumber: composition.slideNumber,
        message: "Live review backgrounds must come from the locked image provider.",
      },
    ];
  }
  const artifact = composition.backgroundArtifact;
  if (
    artifact === undefined ||
    !artifact.path.endsWith(".png") ||
    !artifact.hash.startsWith("sha256:")
  ) {
    return [
      {
        code: "missing_stored_background_artifact",
        slideNumber: composition.slideNumber,
        message: "Live review must reference a stored real background image artifact.",
      },
    ];
  }
  if (!/^sha256:[a-f0-9]{64}$/.test(artifact.hash)) {
    return [
      {
        code: "invalid_stored_background_artifact_hash",
        slideNumber: composition.slideNumber,
        message: "Stored background artifact hash must be a full SHA-256 digest.",
      },
    ];
  }
  if (!backgroundArtifactTargetsSlide(artifact, composition.slideNumber)) {
    return [
      {
        code: "stored_background_artifact_slide_mismatch",
        slideNumber: composition.slideNumber,
        message: "Stored background artifact must target the compositor slide.",
      },
    ];
  }
  return [];
}
