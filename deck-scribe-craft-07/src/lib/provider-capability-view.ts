import type { OpenAIImageFallbackPublicState } from "./image-provider-fallback";
import type { ProviderAuthMode } from "./provider-provenance";
import type { ProviderCapability, ProviderStatus } from "./provider-types";
import {
  createProviderStatusLock,
  providerAuthModeLabel,
  providerStatusLabel,
} from "./provider-status-view";

export type ProviderFeatureKey =
  | "text_planning"
  | "research_assist"
  | "image_generation"
  | "revision_generation";

export type ProviderCapabilityRowStatus = "available" | "locked";

export type ProviderCapabilityRow = {
  readonly key: ProviderFeatureKey;
  readonly label: string;
  readonly status: ProviderCapabilityRowStatus;
  readonly stateLabel: string;
  readonly reason: string;
  readonly actionLabel: string;
};

export type ProviderCapabilityMatrixView = {
  readonly providerName: string;
  readonly selectedProviderId: string;
  readonly authModeLabel: string;
  readonly statusLabel: string;
  readonly providerStatusMessage: string;
  readonly rows: readonly ProviderCapabilityRow[];
};

export type ProviderCapabilityMatrixInput = {
  readonly providerName: string;
  readonly authMode: ProviderAuthMode;
  readonly status: ProviderStatus;
  readonly capabilities: readonly ProviderCapability[];
  readonly imageFallback?: OpenAIImageFallbackPublicState;
};

type FeatureDefinition = {
  readonly key: ProviderFeatureKey;
  readonly label: string;
  readonly capability: ProviderCapability;
  readonly availableReason: string;
  readonly missingReason: string;
  readonly missingAction: string;
};

const TEXT_PLANNING: FeatureDefinition = {
  key: "text_planning",
  label: "텍스트 기획",
  capability: "deckPlan",
  availableReason: "can create deck plans",
  missingReason: "deck planning",
  missingAction: "Provider 기획 기능 연결",
};

const RESEARCH_ASSIST: FeatureDefinition = {
  key: "research_assist",
  label: "조사 보조",
  capability: "research",
  availableReason: "can create research packs",
  missingReason: "research assistance",
  missingAction: "Provider 조사 기능 연결",
};

export function createProviderCapabilityMatrixView(
  input: ProviderCapabilityMatrixInput,
): ProviderCapabilityMatrixView {
  const imageRow = createImageGenerationRow(input);
  return {
    providerName: input.providerName,
    selectedProviderId: input.status.providerId,
    authModeLabel: providerAuthModeLabel(input.authMode),
    statusLabel: providerStatusLabel(input.status),
    providerStatusMessage: input.status.message,
    rows: [
      createProviderFeatureRow(input, TEXT_PLANNING),
      createProviderFeatureRow(input, RESEARCH_ASSIST),
      imageRow,
      createRevisionGenerationRow(input, imageRow),
    ],
  };
}

function createProviderFeatureRow(
  input: ProviderCapabilityMatrixInput,
  definition: FeatureDefinition,
): ProviderCapabilityRow {
  const statusLock = createProviderStatusLock(input.providerName, input.status);
  if (statusLock !== undefined) {
    return lockedRow(definition.key, definition.label, statusLock.reason, statusLock.actionLabel);
  }

  if (input.capabilities.includes(definition.capability)) {
    return availableRow(
      definition.key,
      definition.label,
      `${input.providerName} ${definition.availableReason} in the current auth state.`,
    );
  }

  return lockedRow(
    definition.key,
    definition.label,
    `Connected provider does not expose ${definition.missingReason}.`,
    definition.missingAction,
  );
}

function createImageGenerationRow(input: ProviderCapabilityMatrixInput): ProviderCapabilityRow {
  const statusLock = createProviderStatusLock(input.providerName, input.status);
  if (statusLock === undefined && input.capabilities.includes("imageGeneration")) {
    return availableRow(
      "image_generation",
      "이미지 생성",
      `${input.providerName} can generate images in the current auth state.`,
    );
  }

  if (input.imageFallback !== undefined) {
    return imageFallbackRow(input.imageFallback);
  }

  if (statusLock !== undefined) {
    return lockedRow("image_generation", "이미지 생성", statusLock.reason, statusLock.actionLabel);
  }

  return lockedRow(
    "image_generation",
    "이미지 생성",
    "Connected provider does not expose image generation.",
    "Codex 이미지 생성 확인",
  );
}

function createRevisionGenerationRow(
  input: ProviderCapabilityMatrixInput,
  imageRow: ProviderCapabilityRow,
): ProviderCapabilityRow {
  if (imageRow.status === "locked") {
    return lockedRow(
      "revision_generation",
      "수정 생성",
      "Image generation must be available before revision generation.",
      "이미지 생성 잠금 해제",
    );
  }

  const statusLock = createProviderStatusLock(input.providerName, input.status);
  if (statusLock !== undefined) {
    return lockedRow("revision_generation", "수정 생성", statusLock.reason, statusLock.actionLabel);
  }

  if (!input.capabilities.includes("editableLayers")) {
    return lockedRow(
      "revision_generation",
      "수정 생성",
      "Provider must expose editable layer generation for revisions.",
      "Editable layer provider 연결",
    );
  }

  return availableRow(
    "revision_generation",
    "수정 생성",
    `${input.providerName} can regenerate editable slide revisions in the current auth state.`,
  );
}

function imageFallbackRow(fallback: OpenAIImageFallbackPublicState): ProviderCapabilityRow {
  if (fallback.providerId !== "codex" || fallback.authMode !== "codexOAuth") {
    return codexImageCapabilityLockedRow();
  }

  switch (fallback.setup) {
    case "ready":
      return availableRow(
        "image_generation",
        "이미지 생성",
        "Codex image generation is confirmed for this runtime.",
      );
    case "requiresApiCredential":
      return codexImageCapabilityLockedRow();
    case "requiresOrganizationVerification":
      return codexImageCapabilityLockedRow();
    case "requiresCodexImageCapability":
      return codexImageCapabilityLockedRow();
    default:
      return assertNever(fallback.setup);
  }
}

function codexImageCapabilityLockedRow(): ProviderCapabilityRow {
  return lockedRow(
    "image_generation",
    "이미지 생성",
    "Codex image generation must be confirmed for this runtime.",
    "Codex 이미지 생성 확인",
  );
}

function availableRow(
  key: ProviderFeatureKey,
  label: string,
  reason: string,
): ProviderCapabilityRow {
  return {
    key,
    label,
    status: "available",
    stateLabel: "사용 가능",
    reason,
    actionLabel: "현재 설정으로 사용 가능",
  };
}

function lockedRow(
  key: ProviderFeatureKey,
  label: string,
  reason: string,
  actionLabel: string,
): ProviderCapabilityRow {
  return {
    key,
    label,
    status: "locked",
    stateLabel: "잠김",
    reason,
    actionLabel,
  };
}

function assertNever(value: never): never {
  throw new Error(`Unexpected provider capability matrix value: ${String(value)}`);
}
