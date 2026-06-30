import type { ProviderCapabilityMatrixInput } from "./provider-capability-view";
import type { ProductionTextWorkflowBridgeStatus } from "./production-text-workflow-gate";
import { createNewProjectProviderMatrixInput } from "./provider-runtime-selection";
import type { ProviderCapability } from "./provider-types";
import { createCodexLiveStatusView, createCodexProviderStatus } from "./codex-live-status";

export const CODEX_APP_SERVER_CAPABILITIES = [
  "interview",
  "research",
  "deckPlan",
  "designSystem",
  "layoutPrototype",
] as const satisfies readonly ProviderCapability[];

export function createClientNewProjectProviderMatrixInput(input: {
  readonly isProductionBuild?: boolean;
  readonly appServerBridge: ProductionTextWorkflowBridgeStatus;
}): ProviderCapabilityMatrixInput {
  if (input.isProductionBuild === true || input.appServerBridge === "available") {
    if (input.appServerBridge === "available") {
      const statusView = createCodexLiveStatusView({
        bridge: input.appServerBridge,
        login: { kind: "idle" },
        smoke: { kind: "idle" },
        workflow: { kind: "idle" },
      });
      return {
        providerName: "Codex",
        authMode: "codex_session",
        status: createCodexProviderStatus(statusView),
        capabilities: CODEX_APP_SERVER_CAPABILITIES,
      };
    }
    return createNewProjectProviderMatrixInput("production");
  }

  return {
    providerName: "Codex",
    authMode: "codex_session",
    status: {
      kind: "unavailable",
      providerId: "codex",
      message:
        "브라우저 개발 서버에는 데스크톱 Codex 브리지가 없습니다. DMG/Tauri 앱에서 연결 및 실행 환경을 열어 Codex를 연결하세요.",
    },
    capabilities: [],
  };
}

export const newProjectProviderMatrixInput: ProviderCapabilityMatrixInput =
  createClientNewProjectProviderMatrixInput({
    isProductionBuild: import.meta.env.PROD,
    appServerBridge: "missing",
  });

export const imageGenerationProviderId = import.meta.env.PROD ? "openaiImage" : "mock";
