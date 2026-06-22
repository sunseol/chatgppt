import { getDesktopAppServerBridgeStatus } from "./desktop-app-server-bridge";
import type { ProviderCapabilityMatrixInput } from "./provider-capability-view";
import type { ExecutionMode } from "./provider-provenance";
import {
  createNewProjectProviderMatrixInput,
  selectImageGenerationProviderId,
} from "./provider-runtime-selection";

const clientExecutionMode: ExecutionMode = import.meta.env.PROD ? "production" : "development";

export function createClientNewProjectProviderMatrixInput(): ProviderCapabilityMatrixInput {
  return createNewProjectProviderMatrixInput(
    clientExecutionMode,
    clientExecutionMode === "production" ? getDesktopAppServerBridgeStatus() : "missing",
  );
}

export const newProjectProviderMatrixInput = createClientNewProjectProviderMatrixInput();

export const imageGenerationProviderId = selectImageGenerationProviderId(clientExecutionMode);
