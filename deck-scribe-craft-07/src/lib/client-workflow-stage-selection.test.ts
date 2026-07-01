import { describe, expect, test } from "bun:test";
import { selectClientWorkflowStageRuntime } from "./client-workflow-stage-selection";

describe("client workflow stage selection", () => {
  test("uses live production screens in Tauri dev when the App Server bridge exists", () => {
    const runtime = selectClientWorkflowStageRuntime({
      isProductionBuild: false,
      appServerBridge: "available",
    });

    expect(runtime).toBe("production");
  });

  test("keeps browser-only development on the mock workflow stage", () => {
    const runtime = selectClientWorkflowStageRuntime({
      isProductionBuild: false,
      appServerBridge: "missing",
    });

    expect(runtime).toBe("development");
  });
});
