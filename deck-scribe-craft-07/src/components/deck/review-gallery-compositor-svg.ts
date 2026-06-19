import {
  backgroundArtifactTargetsSlide,
  type FinalSlideComposition,
} from "@/lib/final-slide-compositor";

export function compositorSvgArtifactIssues(composition: FinalSlideComposition) {
  const artifact = composition.backgroundArtifact;
  if (artifact === undefined || !isSha256Digest(artifact.hash)) return [];
  if (!backgroundArtifactTargetsSlide(artifact, composition.slideNumber)) return [];
  const requiredAttributes = [
    `data-background-artifact-id="${artifact.artifactId}"`,
    `data-background-artifact-path="${artifact.path}"`,
    `data-background-artifact-hash="${artifact.hash}"`,
  ];
  return requiredAttributes.every((attribute) => composition.svg.includes(attribute))
    ? []
    : [
        {
          code: "compositor_svg_artifact_mismatch" as const,
          slideNumber: composition.slideNumber,
          message: "Compositor SVG must reference the stored background artifact.",
        },
      ];
}

function isSha256Digest(hash: string): boolean {
  return /^sha256:[a-f0-9]{64}$/.test(hash);
}
