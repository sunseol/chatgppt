import type {
  ProjectAsset,
  ProjectAssetExternalTransferReview,
  ProjectAssetTransferTarget,
} from "./project-assets";
import { createAssetExternalTransferReview } from "./project-assets";

export type VisualAssetPlacementRole = "logo" | "product_image";
export type VisualAssetPlacementDestination = "design_system" | "slide_spec";

export type GeneratedVisualAssetCandidate = {
  readonly id: string;
  readonly role: VisualAssetPlacementRole;
  readonly description: string;
};

export type VisualAssetPlacementPlanInput = {
  readonly role: VisualAssetPlacementRole;
  readonly destination: VisualAssetPlacementDestination;
  readonly transferTarget: ProjectAssetTransferTarget;
  readonly userAssets: readonly ProjectAsset[];
  readonly generatedCandidates: readonly GeneratedVisualAssetCandidate[];
};

export type UserAssetPlacementSuggestion = {
  readonly kind: "user_asset";
  readonly role: VisualAssetPlacementRole;
  readonly destination: VisualAssetPlacementDestination;
  readonly sourceAssetId: string;
  readonly assetPath: string;
  readonly originalFileName: string;
  readonly priority: number;
  readonly transferReview: ProjectAssetExternalTransferReview;
  readonly promptInstruction: string;
};

export type GeneratedVisualAssetPlacementSuggestion = {
  readonly kind: "generated";
  readonly role: VisualAssetPlacementRole;
  readonly destination: VisualAssetPlacementDestination;
  readonly candidateId: string;
  readonly description: string;
  readonly priority: number;
  readonly promptInstruction: string;
};

export type VisualAssetPlacementSuggestion =
  | UserAssetPlacementSuggestion
  | GeneratedVisualAssetPlacementSuggestion;

export type VisualAssetPlacementPlan = {
  readonly role: VisualAssetPlacementRole;
  readonly destination: VisualAssetPlacementDestination;
  readonly suggestions: readonly VisualAssetPlacementSuggestion[];
};

const ROLE_LABELS: Record<VisualAssetPlacementRole, string> = {
  logo: "logo",
  product_image: "product image",
};

export class ProjectAssetPlacementError extends Error {
  readonly name = "ProjectAssetPlacementError";

  constructor(
    readonly sourceAssetId: string,
    readonly assetKind: string,
  ) {
    super(
      `Project asset ${sourceAssetId} cannot be used as a visual placement because it is ${assetKind}.`,
    );
  }
}

export function createVisualAssetPlacementPlan(
  input: VisualAssetPlacementPlanInput,
): VisualAssetPlacementPlan {
  return {
    role: input.role,
    destination: input.destination,
    suggestions: [
      ...input.userAssets.map((asset, index) =>
        createUserAssetSuggestion(
          asset,
          input.role,
          input.destination,
          input.transferTarget,
          index,
        ),
      ),
      ...input.generatedCandidates
        .filter((candidate) => candidate.role === input.role)
        .map((candidate, index) =>
          createGeneratedSuggestion(candidate, input.destination, 100 + index),
        ),
    ],
  };
}

function createUserAssetSuggestion(
  asset: ProjectAsset,
  role: VisualAssetPlacementRole,
  destination: VisualAssetPlacementDestination,
  transferTarget: ProjectAssetTransferTarget,
  priority: number,
): UserAssetPlacementSuggestion {
  if (asset.kind !== "image") {
    throw new ProjectAssetPlacementError(asset.artifact.id, asset.kind);
  }

  return {
    kind: "user_asset",
    role,
    destination,
    sourceAssetId: asset.artifact.id,
    assetPath: asset.artifact.path,
    originalFileName: asset.originalFileName,
    priority,
    transferReview: createAssetExternalTransferReview(asset, transferTarget),
    promptInstruction: `Use user-provided ${ROLE_LABELS[role]} asset ${asset.artifact.id} from ${asset.originalFileName} before considering generated imagery.`,
  };
}

function createGeneratedSuggestion(
  candidate: GeneratedVisualAssetCandidate,
  destination: VisualAssetPlacementDestination,
  priority: number,
): GeneratedVisualAssetPlacementSuggestion {
  return {
    kind: "generated",
    role: candidate.role,
    destination,
    candidateId: candidate.id,
    description: candidate.description,
    priority,
    promptInstruction: `Use generated ${ROLE_LABELS[candidate.role]} candidate ${candidate.id} only when no suitable user asset is available.`,
  };
}
