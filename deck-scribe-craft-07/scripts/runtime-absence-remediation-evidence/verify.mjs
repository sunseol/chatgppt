import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProviderReadinessBadge } from "../../src/components/deck/NewProjectForm.tsx";
import { ProductionTextWorkflowPanel } from "../../src/components/deck/ProductionTextWorkflowPanel.tsx";
import { createClientNewProjectProviderMatrixInput } from "../../src/lib/client-provider-runtime-selection.ts";
import { createCodexStatusActionError } from "../../src/lib/codex-live-status.ts";
import {
  SUPPORTED_CODEX_RUNTIME,
  evaluateCodexRuntime,
  formatSupportedCodexRuntimeRange,
} from "../../src/lib/codex-runtime.ts";
import { createProviderCapabilityMatrixView } from "../../src/lib/provider-capability-view.ts";
import {
  createNewProjectProviderMatrixInput,
  selectImageGenerationProviderId,
} from "../../src/lib/provider-runtime-selection.ts";

const SOURCE_REFS = [
  "src/lib/codex-runtime.ts",
  "src/lib/codex-live-status-error.ts",
  "src/components/deck/ProductionTextWorkflowPanel.tsx",
  "src/components/deck/NewProjectForm.tsx",
  "src/lib/provider-runtime-selection.ts",
];

export async function verifyRuntimeAbsenceRemediationEvidence(options = {}) {
  const checks = [];
  const runtimeRange = formatSupportedCodexRuntimeRange();
  const missingRuntime = evaluateCodexRuntime({ kind: "missing" });
  const permissionDenied = evaluateCodexRuntime({
    kind: "found",
    executablePath: "/usr/local/bin/codex",
    version: "1.2.3",
    canExecute: false,
  });

  recordCheck(checks, {
    key: "runtime_status_missing",
    ok: missingRuntime.kind === "missing" && missingRuntime.message.includes("not found"),
    detail: missingRuntime.message,
    refs: ["src/lib/codex-runtime.ts"],
  });
  recordCheck(checks, {
    key: "supported_runtime_range_visible",
    ok:
      missingRuntime.supportedRange.minInclusive === SUPPORTED_CODEX_RUNTIME.minInclusive &&
      missingRuntime.supportedRange.maxExclusive === SUPPORTED_CODEX_RUNTIME.maxExclusive &&
      runtimeRange.includes(SUPPORTED_CODEX_RUNTIME.minInclusive) &&
      runtimeRange.includes(SUPPORTED_CODEX_RUNTIME.maxExclusive),
    detail: runtimeRange,
    refs: ["src/lib/codex-runtime.ts"],
  });
  recordCheck(checks, {
    key: "install_remediation_present",
    ok: missingRuntime.remediation.includes("Install Codex CLI"),
    detail: missingRuntime.remediation,
    refs: ["src/lib/codex-runtime.ts"],
  });
  recordCheck(checks, {
    key: "permission_remediation_present",
    ok:
      permissionDenied.kind === "permissionDenied" &&
      permissionDenied.remediation.includes("permissions"),
    detail: permissionDenied.remediation,
    refs: ["src/lib/codex-runtime.ts"],
  });

  const failedRuntimeMarkup = renderToStaticMarkup(
    createElement(ProductionTextWorkflowPanel, {
      project: projectFixture(),
      step: "interview",
      appServerBridge: "available",
      runStatus: {
        kind: "failed",
        message: "spawn /missing/vendor/codex ENOENT",
        error: createCodexStatusActionError({
          code: "codex_cli_unavailable",
          message: "spawn /missing/vendor/codex ENOENT",
        }),
      },
      onRun: () => undefined,
      onRetry: () => undefined,
    }),
  );
  recordCheck(checks, {
    key: "missing_cli_user_copy_visible",
    ok:
      failedRuntimeMarkup.includes("Codex CLI를 찾을 수 없습니다") &&
      failedRuntimeMarkup.includes(`지원 버전 ${runtimeRange}`) &&
      failedRuntimeMarkup.includes("Codex CLI를 설치"),
    detail: "Missing Codex CLI failure copy includes title, supported range, and install action.",
    refs: [
      "src/lib/codex-live-status-error.ts",
      "src/components/deck/ProductionTextWorkflowPanel.tsx",
    ],
  });

  const bridgeBlockedMarkup = renderToStaticMarkup(
    createElement(ProductionTextWorkflowPanel, {
      project: projectFixture(),
      step: "interview",
      appServerBridge: "missing",
      onRun: () => undefined,
      onOpenConnectionSettings: () => undefined,
    }),
  );
  recordCheck(checks, {
    key: "live_text_action_locked_without_runtime_bridge",
    ok:
      bridgeBlockedMarkup.includes("app_server_bridge_missing") &&
      bridgeBlockedMarkup.includes("연결 및 실행 환경 열기") &&
      firstButtonMarkup(bridgeBlockedMarkup).includes("disabled"),
    detail:
      "Live interview action is disabled and points to connection settings when bridge is absent.",
    refs: ["src/components/deck/ProductionTextWorkflowPanel.tsx"],
  });

  const readinessMarkup = renderToStaticMarkup(
    createElement(ProviderReadinessBadge, {
      view: createProviderCapabilityMatrixView(
        createClientNewProjectProviderMatrixInput({
          isProductionBuild: false,
          appServerBridge: "missing",
        }),
      ),
      onOpenConnectionSettings: () => undefined,
    }),
  );
  const productionProvider = createNewProjectProviderMatrixInput("production");
  recordCheck(checks, {
    key: "no_mock_fallback_in_runtime_absence_ui",
    ok:
      readinessMarkup.includes("라이브 전환 필요") &&
      !readinessMarkup.includes("Mock Provider") &&
      productionProvider.providerName === "Codex" &&
      productionProvider.status.providerId === "codex" &&
      selectImageGenerationProviderId("production") === "openaiImage",
    detail:
      "Unavailable runtime UI stays on Codex/live provider paths and production image routing is live-only.",
    refs: [
      "src/components/deck/NewProjectForm.tsx",
      "src/lib/provider-runtime-selection.ts",
      "src/lib/client-provider-runtime-selection.ts",
    ],
  });

  const ok = checks.every((check) => check.ok);
  return {
    schemaVersion: 1,
    ok,
    status: ok ? "pass" : "blocked",
    checkedAt: options.checkedAt ?? new Date().toISOString(),
    evidenceKind: "runtime_absence_remediation",
    supportedRange: SUPPORTED_CODEX_RUNTIME,
    sourceRefs: SOURCE_REFS,
    checks,
  };
}

function recordCheck(checks, input) {
  checks.push({
    key: input.key,
    ok: Boolean(input.ok),
    detail: input.detail,
    refs: input.refs,
  });
}

function firstButtonMarkup(markup) {
  const buttonStart = markup.indexOf("<button");
  const buttonEnd = markup.indexOf("</button>", buttonStart);
  if (buttonStart < 0 || buttonEnd < 0) return "";
  return markup.slice(buttonStart, buttonEnd);
}

function projectFixture() {
  return {
    id: "runtime_absence_project",
    name: "Runtime Absence Project",
    initialPrompt: "Verify runtime absence remediation.",
    aspectRatio: "16:9",
    language: "ko",
    slideCount: 5,
    stage: "PROJECT_CREATED",
    createdAt: 1_789_300_000,
    updatedAt: 1_789_300_000,
    invalidated: {},
    approvalLog: [],
  };
}
