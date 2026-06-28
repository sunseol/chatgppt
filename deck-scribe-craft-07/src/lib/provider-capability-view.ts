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
  readonly statusKind: ProviderStatus["kind"];
  readonly isLiveReady: boolean;
  readonly isMockProvider: boolean;
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
  availableReason: "에서 텍스트 기획을 생성할 수 있습니다.",
  missingReason: "텍스트 기획",
  missingAction: "Provider 기획 기능 연결",
};

const RESEARCH_ASSIST: FeatureDefinition = {
  key: "research_assist",
  label: "조사 보조",
  capability: "research",
  availableReason: "에서 조사팩을 생성할 수 있습니다.",
  missingReason: "조사 보조",
  missingAction: "Provider 조사 기능 연결",
};

export function createProviderCapabilityMatrixView(
  input: ProviderCapabilityMatrixInput,
): ProviderCapabilityMatrixView {
  const imageRow = createImageGenerationRow(input);
  const isMockProvider = input.status.providerId === "mock";
  return {
    providerName: input.providerName,
    selectedProviderId: input.status.providerId,
    authModeLabel: providerAuthModeLabel(input.authMode),
    statusLabel: providerStatusLabel(input.status),
    statusKind: input.status.kind,
    isLiveReady: input.status.kind === "connected" && !isMockProvider,
    isMockProvider,
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
      `${input.providerName}${definition.availableReason}`,
    );
  }

  return lockedRow(
    definition.key,
    definition.label,
    `현재 연결된 provider에는 ${definition.missingReason} 기능이 없습니다.`,
    definition.missingAction,
  );
}

function createImageGenerationRow(input: ProviderCapabilityMatrixInput): ProviderCapabilityRow {
  const statusLock = createProviderStatusLock(input.providerName, input.status);
  if (statusLock === undefined && input.capabilities.includes("imageGeneration")) {
    return availableRow(
      "image_generation",
      "이미지 생성",
      `${input.providerName}에서 이미지 생성 기능을 사용할 수 있습니다.`,
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
    "현재 연결된 provider에는 이미지 생성 기능이 없습니다.",
    "OpenAI 이미지 fallback 설정",
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
      "수정 생성을 사용하려면 이미지 생성 기능이 먼저 필요합니다.",
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
      "수정 생성을 사용하려면 편집 가능한 레이어 생성 기능이 필요합니다.",
      "Editable layer provider 연결",
    );
  }

  return availableRow(
    "revision_generation",
    "수정 생성",
    `${input.providerName}에서 편집 가능한 슬라이드 수정을 생성할 수 있습니다.`,
  );
}

function imageFallbackRow(fallback: OpenAIImageFallbackPublicState): ProviderCapabilityRow {
  switch (fallback.setup) {
    case "ready":
      if (fallback.credentialState === "sessionConfigured") {
        return availableRow(
          "image_generation",
          "이미지 생성",
          "이 세션에서 OpenAI 이미지 fallback을 사용할 수 있습니다.",
        );
      }
      return lockedRow(
        "image_generation",
        "이미지 생성",
        "OpenAI 이미지 fallback을 사용하려면 세션 API Key가 필요합니다.",
        "세션 API Key 입력",
      );
    case "requiresApiCredential":
      return lockedRow(
        "image_generation",
        "이미지 생성",
        "OpenAI 이미지 fallback을 사용하려면 세션 API Key가 필요합니다.",
        "세션 API Key 입력",
      );
    case "requiresOrganizationVerification":
      return lockedRow(
        "image_generation",
        "이미지 생성",
        "선택한 이미지 모델을 사용하려면 OpenAI 조직 인증이 필요합니다.",
        "OpenAI 조직 인증 확인",
      );
    default:
      return assertNever(fallback.setup);
  }
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
