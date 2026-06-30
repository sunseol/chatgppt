import type { ProductionTextWorkflowBridgeStatus } from "./production-text-workflow-gate";

export type ClientWorkflowStageRuntime = "development" | "production";

export function selectClientWorkflowStageRuntime(input: {
  readonly isProductionBuild: boolean;
  readonly appServerBridge: ProductionTextWorkflowBridgeStatus;
}): ClientWorkflowStageRuntime {
  if (input.isProductionBuild || input.appServerBridge === "available") return "production";
  return "development";
}
