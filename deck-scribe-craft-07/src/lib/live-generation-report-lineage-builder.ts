import type { DeckProject } from "./deck-types";
import type { LiveSlideReportLineage } from "./live-generation-report-lineage";
import type { LiveTextArtifactRecord, LiveTextArtifactType } from "./live-text-artifact-record";
import { buildMinimalSlideSourceMap } from "./slide-source-map";

export type LiveLineageExportPackage = {
  readonly pngFiles: readonly {
    readonly slideNumber: number;
    readonly hash: string;
  }[];
  readonly projectFile: {
    readonly content: string;
  };
};

export function buildLiveGenerationReportLineage(input: {
  readonly project: DeckProject;
  readonly exportPackage: LiveLineageExportPackage | undefined;
}): readonly LiveSlideReportLineage[] {
  const liveGeneration = input.project.liveSlideGeneration;
  const exportPackage = input.exportPackage;
  const textArtifact = selectTextArtifact(input.project.liveTextArtifacts ?? []);
  if (!liveGeneration || !textArtifact || !exportPackage) return [];

  const sourceIds = sourceIdsBySlide(input.project);
  const artifacts = new Map(
    liveGeneration.artifacts.map((artifact) => [artifact.slideNumber, artifact]),
  );
  const compositions = new Map(
    liveGeneration.compositions.map((composition) => [composition.slideNumber, composition]),
  );
  const exportPngHashes = new Map(
    exportPackage.pngFiles.map((file) => [file.slideNumber, file.hash]),
  );

  return liveGeneration.storedArtifacts
    .map((stored): LiveSlideReportLineage => {
      const slideNumber = stored.metadata.slideNumber;
      const artifact = artifacts.get(slideNumber);
      const composition = compositions.get(slideNumber);
      return {
        slideNumber,
        sourceIds: sourceIds.get(slideNumber) ?? [],
        textArtifactId: textArtifact.artifactId,
        textProviderKind: "codex",
        ...(textArtifact.turnId === undefined ? {} : { textTurnId: textArtifact.turnId }),
        ...(textArtifact.threadId === undefined ? {} : { textThreadId: textArtifact.threadId }),
        imageArtifactId: stored.binary.artifactId,
        imageProviderKind: artifact?.providerId ?? stored.metadata.providerId,
        ...(stored.metadata.request.requestId === undefined
          ? {}
          : { imageRequestId: stored.metadata.request.requestId }),
        promptVersion: stored.provenance.promptVersion,
        fixture: stored.provenance.fixture,
        compositorHash: composition?.backgroundArtifact?.hash ?? stored.binary.hash,
        exportedPngHash: exportPngHashes.get(slideNumber) ?? "",
        projectFileContent: exportPackage.projectFile.content,
      };
    })
    .sort((left, right) => left.slideNumber - right.slideNumber);
}

function selectTextArtifact(
  artifacts: readonly LiveTextArtifactRecord[],
): LiveTextArtifactRecord | undefined {
  return (
    latestArtifact(artifacts, "deck_plan") ??
    latestArtifact(artifacts, "layout_ir") ??
    latestArtifact(artifacts, "design_system") ??
    latestArtifact(artifacts, "interview_brief")
  );
}

function latestArtifact(
  artifacts: readonly LiveTextArtifactRecord[],
  type: LiveTextArtifactType,
): LiveTextArtifactRecord | undefined {
  return [...artifacts]
    .filter((artifact) => artifact.artifactType === type)
    .sort((left, right) => right.createdAt - left.createdAt || right.version - left.version)[0];
}

function sourceIdsBySlide(project: DeckProject): ReadonlyMap<number, readonly string[]> {
  if (!project.plan || !project.research) return new Map();
  const sourceMap = buildMinimalSlideSourceMap({
    slides: project.plan.slides,
    research: project.research,
  });
  return new Map(sourceMap.entries.map((entry) => [entry.slideNumber, entry.sourceIds]));
}
